import boto3
import os
import fitz  # PyMuPDF
import docx
from PIL import Image
import pytesseract
import tempfile
import traceback
import io
import numpy as np
import torch
from tensorflow import keras
from transformers import AutoTokenizer, AutoModel
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import ObjectId
import pandas as pd
from pptx import Presentation
from bs4 import BeautifulSoup

print("Starting Lambda function...")

s3 = boto3.client('s3')
# Cấu hình Tesseract binary
pytesseract.pytesseract.tesseract_cmd = "/var/task/tesseract/bin/tesseract"
os.environ["TESSDATA_PREFIX"] = "/var/task/tesseract/tesseract/share/tessdata"
os.environ["LD_LIBRARY_PATH"] = "/var/task/tesseract/lib"
os.environ["TRANSFORMERS_CACHE"] = "/tmp/huggingface"


# --- Load .env ---
load_dotenv()
MONGO_URI = os.getenv("MONGODB_CONNECTION_STRING")

# --- Kết nối MongoDB ---
client = MongoClient(MONGO_URI)
db = client["test"]  # đổi thành tên DB của bạn
collection = db["files"]   # đổi thành tên collection chứa FileSchema


def extract_text(filepath, file_ext):
    if not os.path.exists(filepath):
        print(f"[ERROR] File not found: {filepath}")
        return ""
    if file_ext == 'txt' or file_ext == 'md':
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    elif file_ext == 'pdf':
        doc = fitz.open(filepath)
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    elif file_ext in ['docx', 'doc']:
        doc = docx.Document(filepath)
        return "\n".join([para.text for para in doc.paragraphs])
    elif file_ext in ['jpg', 'jpeg', 'png']:
        img = Image.open(filepath).convert('L')  # Convert to grayscale
        return pytesseract.image_to_string(img)
    elif file_ext in ['xlsx', 'csv']:
        df = pd.read_excel(filepath) if file_ext == 'xlsx' else pd.read_csv(filepath)
        return df.to_string(index=False)
    elif file_ext == "pptx":
        prs = Presentation(filepath)
        text = []
        for slide in prs.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    text.append(shape.text)
        return '\n'.join(text)
    elif file_ext == "html":
        with open(filepath, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f, 'html.parser')
            return soup.get_text(separator='\n')
    else:
        print(f"[WARNING] Unsupported file type: {file_ext}")
        return "Unsupported file type"


# --- Load tokenizer + model ---
tokenizer = AutoTokenizer.from_pretrained("/var/task/models--bert-base-uncased", local_files_only=True)
bert_model = AutoModel.from_pretrained("/var/task/models--bert-base-uncased", local_files_only=True)
model = keras.models.load_model("/var/task/bert_text_classifier.keras", compile=False)

# --- Hàm xử lý text ---
def get_embedding(text):
    inputs = tokenizer.encode_plus(text, return_tensors='pt', max_length=128, truncation=True, padding='max_length')
    with torch.no_grad():
        output = bert_model(**inputs)['last_hidden_state']
    return output.squeeze().numpy().reshape(1, 128, 768)  # reshape để match input model

# --- Predict & update MongoDB ---
def classify_and_update(file_id, text):
    embedding = get_embedding(text)
    prediction = model.predict(embedding)
    label_map = {0: 'sport', 1: 'tech', 2: 'entertainment', 3: 'politics', 4: 'business'}
    predicted_class = label_map[np.argmax(prediction)]

    file_info = collection.find_one({"_id": file_id})
    print(f"File ID: {file_id}, Current Category: {file_info.get('document_category', 'N/A')}")

    # --- Cập nhật document_category ---
    result = collection.update_one(
        {"_id": file_id},  # bạn có thể thay bằng `{"key": "some_key"}` nếu dùng `key` làm định danh
        {"$set": {"document_category": predicted_class}}
    )
    print(f"Updated file {file_id} to category: {predicted_class} - Modified: {result.modified_count}")


def lambda_handler(event, context):
    try:
        bucket = event['Records'][0]['s3']['bucket']['name']
        key    = event['Records'][0]['s3']['object']['key']

        file_name = key.split('/')[-1]
        file_ext  = file_name.split('.')[-1].lower()

        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            s3.download_fileobj(bucket, key, tmp_file)
            tmp_file_path = tmp_file.name

        metadata = s3.head_object(Bucket=bucket, Key=key).get('Metadata', {})
        file_id = metadata.get('file_id', None)
        text = ""
        # Extract text based on file type
        text = extract_text(tmp_file_path, file_ext)

        print(f"[INFO] File processed: {file_name}")
        print(f"[INFO] File ID: {file_id}")
        print(f"[INFO] Extracted text (truncated):\n{text[:1000]}")

        if file_id and text != "Unsupported file type" and text != "":
            classify_and_update(ObjectId(file_id), text)
        else:
            print(f"[WARNING] No valid file_id or text extracted for file: {file_name}")

        return {
            "statusCode": 200,
            "body": f"Successfully processed file: {file_name}"
        }

    except Exception as e:
        print(f"[ERROR] Exception occurred: {str(e)}")
        print(traceback.format_exc())
        return {
            "statusCode": 500,
            "body": f"Error processing file: {file_name if 'file_name' in locals() else 'unknown'}"
        }

    finally:
        # Clean up temp file
        if 'tmp_file_path' in locals() and os.path.exists(tmp_file_path):
            os.remove(tmp_file_path)
