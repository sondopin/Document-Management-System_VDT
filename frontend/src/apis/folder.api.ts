import http from '../utils/http';
import {Folders} from '../types/folder.type';
import {searchQueryForm} from '../types/file.type';

type GetFolderParams = {
  option: string;
  parent_folder?: string | null;
  searchQuery?: searchQueryForm;
};

export const getFolders = async (params: GetFolderParams) => {
  const response = await http.post<{ folders: Folders }>('/folders/getfolders', params );
  return response.data.folders;
}

export const uploadFolderAPI = async (formData: FormData) => {
  return http.post("/folders/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

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