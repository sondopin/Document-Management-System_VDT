
import http from "../utils/http";
import {Files} from "../types/file.type";
import { searchQueryForm } from "../types/file.type";
import { AxiosProgressEvent } from "axios";

type GetFilesParams = {
  option: string;
  parent_folder?: string | null;
  searchQuery?: searchQueryForm | null;
};


// Hàm 1: Gọi BE để lấy presigned URL
export const getUploadUrlAPI = async (
    fileName: string,
    fileType: string,
    parent_folder: string | null
) => {
    // Gửi body dạng JSON
    return http.post("/files/generate-upload-url", {
        fileName,
        fileType,
        parent_folder,
    });
};

// Hàm 2: (Không dùng http instance có sẵn vì ta gọi thẳng đến S3)
// Đây chỉ là một hàm helper, bạn có thể viết trực tiếp trong component
export const uploadFileToS3 = async (uploadUrl: string, file: File) => {
    return fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type, // Header này rất quan trọng
        },
    });
};

// (Tùy chọn) Hàm 3: Gọi BE để xác nhận upload đã xong
export const confirmUploadAPI = async (file_id: string, fileSize: number) => {
    return http.post("/files/confirm-upload", { file_id, fileSize });
}


export const getFiles = async (params: GetFilesParams) => {
  const response = await http.post<{ files: Files }>('/files/getfiles', params);
  return response.data.files;
};

export const deleteFileAPI = async (file_id: string) => {
  return http.post("/files/delete", { file_id });
};

export const downloadFile = async (fileId: string) => {
    // Backend giờ đây trả về JSON chứa URL thay vì blob trực tiếp
    return http.get<{ url: string; fileName: string; }>(`/files/download/${fileId}`);
};

export const recoveryFile = async (file_id: string) => {
  return http.post("/files/recover", { file_id });
};

export const deleteFilePermanently = async (file_id: string) => {
  return http.post("/files/delete-permanently", { file_id });
};

export const getPresignedUrl = async (file_id: string) => {
  return http.post<{ url: string }>("/files/share-link", { file_id });
};

export const updateFileAPI = async (file_id: string, data: { name?: string, document_category?: string }) => {
  return http.post(`/files/update/${file_id}`, data);
};

export const shareFileAPI = async (file_id: string, user_share: string) => {
  return http.post(`/files/share-user`, { file_id, user_share });
}