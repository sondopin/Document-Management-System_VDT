
import http from "../utils/http";
import {Files} from "../types/file.type";
import { searchQueryForm } from "../types/file.type";

type GetFilesParams = {
  option: string;
  parent_folder?: string | null;
  searchQuery?: searchQueryForm | null;
};

export const getFiles = async (params: GetFilesParams) => {
  const response = await http.post<{ files: Files }>('/files/getfiles', params);
  return response.data.files;
};

export const uploadFilesAPI = async (formData: FormData) => {
  return http.post("/files/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const deleteFileAPI = async (file_id: string) => {
  return http.post("/files/delete", { file_id });
};

export const downloadFile = async (fileId: string) => {
  return http.get(`/files/download/${fileId}`, {
    responseType: 'blob',
  });
};

export const recoveryFile = async (file_id: string) => {
  return http.post("/files/recover", { file_id });
};

export const deleteFilePermanently = async (file_id: string) => {
  return http.post("/files/delete-permanently", { file_id });
};

export const getPresignedUrl = async (file_id: string) => {
  return http.post<{ url: string }>("/files/share", { file_id });
};

export const updateFileAPI = async (file_id: string, data: { name: string }) => {
  return http.post(`/files/update/${file_id}`, data);
};