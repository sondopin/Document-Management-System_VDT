FROM public.ecr.aws/lambda/python:3.12

# Cài pip và các Python dependencies
RUN pip install --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Tesseract binaries của bạn
COPY tesseract /opt/tesseract

# Biến môi trường cho Tesseract
ENV PATH="/opt/tesseract/bin:${PATH}"
ENV LD_LIBRARY_PATH="/opt/tesseract/lib:${LD_LIBRARY_PATH}"
ENV TESSDATA_PREFIX="/opt/tesseract/share/tessdata"
# ENV TRANSFORMERS_CACHE="/tmp/huggingface"


# Copy toàn bộ source code vào container (lambda_function.py, .env, model,...)
COPY . /var/task

# Lambda handler
CMD ["lambda_function.lambda_handler"]
