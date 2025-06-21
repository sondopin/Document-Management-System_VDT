
import http from "../utils/http";
import {Files} from "../types/file.type";
import { searchQueryForm } from "../types/file.type";

type GetFilesParams = {
  option: string;
  parent_folder?: string | null;
  searchQuery?: searchQueryForm | null;
};


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

// File: services/api.ts
export const uploadFileToS3WithProgress = (
    uploadUrl: string,
    file: File,
    onProgress: (progress: { loaded: number; total: number }) => void
): Promise<XMLHttpRequest> => {
    // ... code của hàm này giữ nguyên như các bước trước
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                onProgress({ loaded: event.loaded, total: event.total });
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress({ loaded: file.size, total: file.size });
                resolve(xhr);
            } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
        };
        xhr.onerror = () => reject(new Error("Network error."));
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
    });
};


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

export const unShareFileAPI = async (file_id: string) => {
  return http.post(`/files/unshare`, { file_id });
}