import http from '../utils/http';
import {Folders} from '../types/folder.type';
import {searchQueryForm} from '../types/file.type';

type GetFolderParams = {
  option: string;
  parent_folder?: string | null;
  searchQuery?: searchQueryForm;
};

// Hàm 1: Gửi cấu trúc folder để lấy danh sách URL
export const prepareFolderUploadAPI = async (
    folder_structure: any[],
    parent_folder: string | null
) => {
    return http.post("/folders/prepare-upload", {
        folder_structure,
        parent_folder,
    });
};

// Hàm uploadFileToS3 giữ nguyên từ ví dụ trước

// Hàm 2: Gửi xác nhận sau khi tất cả file đã upload xong
export const completeFolderUploadAPI = async (
    completedFiles: { fileId: string, fileSize: number }[]
) => {
    return http.post("/folders/complete-upload", { completedFiles });
};



export const getFolders = async (params: GetFolderParams) => {
  const response = await http.post<{ folders: Folders }>('/folders/getfolders', params );
  return response.data.folders;
}

export const createFolderAPI = async (data: {
  name: string;
  parent_folder?: string | null;
}) => {
  return http.post("/folders/create", data);
};

export const deleteFolderAPI = async (folderId: string) => {
  return http.post(`/folders/delete`, { folderId });
};

export const downloadFolder = async (folderId: string) => {
  return http.get(`/folders/download/${folderId}`, {
    responseType: 'blob',
  });
};

export const deleteFolderPermanently = async (folder_id: string) => {
  return http.post(`/folders/delete-permanently`, { folder_id });
};

export const recoveryFolder = async (folderId: string) => {
  return http.post("/folders/recover", { folderId });
};

export const updateFolderAPI = async (folder_id: string, data: { name: string }) => {
  return http.post(`/folders/update/${folder_id}`, data);
}
export const shareFolderAPI = async (folder_id: string, user_share: string) => {
  return http.post(`/folders/share`, { folder_id, user_share });
};

export const unShareFolderAPI = async (folder_id: string) => {
  return http.post(`/folders/unshare`, { folder_id });
}