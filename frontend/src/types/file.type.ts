import { UploadService } from "../apis/file.api";

export interface File {
    _id: string;
    name: string;
    size?: number;
    document_type?: string;
    document_category?: string;
    last_modified?: Date;
    key: string; // Unique identifier for the file, e.g., S3 key
    
    owner_id: string; // Reference to UserType
    shared_with?: string[]; // Array of UserType references
    parent_folder?: string; // Reference to FolderType
    is_deleted?: boolean; // Flag to indicate if the file is deleted
    deleted_at?: Date; // Timestamp when the file was deleted
}


export interface searchQueryForm{
    search_content?: string;
    user?: string;
    permission?: string;
    document_category?: string;
    document_type?: string;
    date_after?: Date | null;
    date_before?: Date | null;
}

// Định nghĩa ở component của bạn
export interface UploadingFile {
    id: string;
    name: string;
    progress: number;
    status: 'uploading' | 'paused' | 'success' | 'error' | 'confirming';
    type: string; // Phân biệt loại mục upload
    errorMessage?: string;
    uploadService?: UploadService;
}

export type Files = File[];