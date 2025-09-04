
import http from "../utils/http";
import { Files } from "../types/file.type";
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


interface InitiateMultipartUploadResponse {
  uploadId: string;
  fileId: string;
  key: string;
}

interface CompleteMultipartUploadParams {
  PartNumber: number;
  ETag: string;
}

enum ChunkStatus {
  pending = 'pending',
  uploading = 'uploading',
  paused = 'paused',
  success = 'success',
  error = 'error'
}

interface Chunk {
  blob?: Blob;
  number: number;
  size: number;
  status: ChunkStatus;
  progress: number;
  retries: number;
  etag?: string;
  uploadPromise?: Promise<void>;
  bytesUploaded?: number;
  presignedUrl?: string;
}

export class UploadService {
  private readonly CHUNK_SIZE = 20 * 1024 * 1024; // 5MB
  private readonly MAX_RETRIES = 3;
  private readonly MAX_CONCURRENT = 15;
  private readonly PROGRESS_THROTTLE = 100; // ms

  private chunks: Chunk[] = [];
  private activeUploads = new Map<number, Promise<void>>();
  private abortController: AbortController | null = null;
  private isPaused = false;
  private lastProgressUpdate = 0;
  private uploadId = '';
  public fileId = '';
  private key = '';

  constructor() {
    this.uploadId = '';
    this.fileId = '';
    this.key = '';
  }

  async initialize(file: File, parent_folder: string | null): Promise<string> {
    const initResponse = await this.initiateMultipartUpload(file, parent_folder);
    this.uploadId = initResponse.uploadId;
    this.fileId = initResponse.fileId;
    this.key = initResponse.key;
    return this.fileId;
  }

  async uploadFile(
    file: File,
    onProgress: (progress: number) => void,
    onComplete: () => void
  ) {
    try {
      if (!this.uploadId || !this.fileId) {
        throw new Error('Upload not initialized');
      }

      this.chunks = this.createChunks(file);
      this.abortController = new AbortController();

      await this.processChunks(file, onProgress);

      if (this.chunks.every(chunk => chunk.status === ChunkStatus.success)) {
        await this.completeMultipartUpload(
          this.uploadId,
          this.fileId,
          this.chunks.map(chunk => ({
            PartNumber: chunk.number,
            ETag: chunk.etag!
          })),
          file.size
        );
        onComplete();
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Upload cancelled') {
        await this.abortMultipartUpload(this.uploadId, this.fileId);
      }
      throw error;
    }
  }

  private async initiateMultipartUpload(
    file: File,
    parent_folder: string | null
  ): Promise<InitiateMultipartUploadResponse> {
    const response = await http.post('/files/initiate-multipart', {
      fileName: file.name,
      fileType: file.type,
      parent_folder
    });
    return response.data;
  }

  private async completeMultipartUpload(
    uploadId: string,
    fileId: string, 
    parts: CompleteMultipartUploadParams[],
    totalSize: number
  ): Promise<void> {
    await http.post('/files/complete-multipart', {
      uploadId,
      fileId,
      parts,
      totalSize
    });
  }

  private async abortMultipartUpload(
    uploadId: string,
    fileId: string
  ): Promise<void> {
    await http.post('/files/abort-multipart', {
      uploadId,
      fileId
    });
  }

  private createChunks(file: File): Chunk[] {
    const chunks: Chunk[] = [];
    let start = 0;
    let number = 1;

    while (start < file.size) {
      const end = Math.min(start + this.CHUNK_SIZE, file.size);
      const blob = file.slice(start, end);

      chunks.push({
        blob,
        number,
        size: blob.size,
        status: ChunkStatus.pending,
        progress: 0,
        retries: 0,
        bytesUploaded: 0
      });

      start = end;
      number++;
    }

    return chunks;
  }

  private async processChunks(file: File, onProgress: (progress: number) => void) {
    while (!this.isComplete() && !this.abortController?.signal.aborted) {
      if (this.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 50));
        continue;
      }

      const chunksToProcess = this.chunks.filter(chunk => 
        chunk.status === ChunkStatus.pending || 
        chunk.status === ChunkStatus.paused
      );

      const availableSlots = this.MAX_CONCURRENT - this.activeUploads.size;
      
      if (availableSlots > 0 && chunksToProcess.length > 0) {
        const nextChunks = chunksToProcess.slice(0, availableSlots);
        
        const uploadPromises = nextChunks.map(chunk => {
          const uploadPromise = this.uploadChunkWithProgress(chunk)
            .then(() => {
              this.updateTotalProgress(onProgress);
              this.activeUploads.delete(chunk.number);
            })
            .catch((error) => {
              if (this.isPaused) {
                chunk.status = ChunkStatus.paused;
              } else {
                chunk.retries++;
                chunk.status = ChunkStatus.pending;
              }
              this.activeUploads.delete(chunk.number);
              throw error;
            });

          this.activeUploads.set(chunk.number, uploadPromise);
          return uploadPromise;
        });

        if (uploadPromises.length > 0) {
          await Promise.race(uploadPromises)
            .catch(error => console.error('Chunk upload failed:', error));
        }
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    if (this.activeUploads.size > 0) {
      await Promise.all(Array.from(this.activeUploads.values()))
        .catch(error => console.error('Final uploads failed:', error));
    }
  }

  private async uploadChunkWithProgress(chunk: Chunk): Promise<void> {
    try {
      if (!chunk.presignedUrl) {
        const response = await http.post('/files/get-part-presigned-url', {
          partNumber: chunk.number,
          uploadId: this.uploadId,
          fileId: this.fileId
        });
        chunk.presignedUrl = response.data.presignedUrl;
      }

      chunk.status = ChunkStatus.uploading;

      const xhr = new XMLHttpRequest();
      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            chunk.bytesUploaded = event.loaded;
            chunk.progress = event.loaded / event.total;
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const etag = xhr.getResponseHeader('ETag');
            if (!etag) {
              reject(new Error('No ETag in upload response'));
              return;
            }
            
            chunk.status = ChunkStatus.success;
            chunk.progress = 1;
            chunk.etag = etag.replace(/['"]/g, '');
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.onabort = () => reject(new Error('Upload aborted'));

        xhr.open('PUT', chunk.presignedUrl!);
        xhr.send(chunk.blob);
      });

      this.cleanupChunk(chunk);

    } catch (error) {
      if (this.isPaused) {
        chunk.status = ChunkStatus.paused;
      } else {
        chunk.status = ChunkStatus.error;
        this.cleanupChunk(chunk);
      }
      throw error;
    }
  }

  private updateTotalProgress(onProgress: (progress: number) => void) {
    const now = Date.now();
    if (now - this.lastProgressUpdate >= this.PROGRESS_THROTTLE) {
      const totalProgress = this.chunks.reduce((sum, chunk) => {
        if (chunk.status === ChunkStatus.success) return sum + 1;
        if (chunk.status === ChunkStatus.uploading && chunk.progress) {
          return sum + chunk.progress;
        }
        return sum;
      }, 0) / this.chunks.length * 100;

      onProgress(totalProgress);
      this.lastProgressUpdate = now;
    }
  }

  private cleanupChunk(chunk: Chunk) {
    chunk.blob = undefined;
    chunk.uploadPromise = undefined;
  }

  private isComplete(): boolean {
    return this.chunks.every(
      chunk => chunk.status === ChunkStatus.success || 
               chunk.retries >= this.MAX_RETRIES
    );
  }

  public pauseUpload(): void {
    this.isPaused = true;
  }

  public resumeUpload(): void {
    this.isPaused = false;
  }

  public cancelUpload(): void {
    this.abortController?.abort();
    this.activeUploads.clear();
  }
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