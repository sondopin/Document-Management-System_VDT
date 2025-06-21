export type UserType = {
  _id: string;
  email: string;
  password: string;
  user_name: string;
  last_modified: Date;
  last_login: Date;
  is_active: boolean;
};

export type FileType = {
    _id: string;
    name: string;
    size?: number;
    document_type?: string;
    document_category?: string;
    last_modified?: Date;
    key: string; // Unique identifier for the file, e.g., S3 key
    owner_id: string; // Reference to UserType
    shared_with?: string[];
    parent_folder?: string; // Reference to FolderType
    is_deleted?: boolean; // Flag to indicate if the file is deleted
    deleted_at?: Date; // Timestamp when the file was deleted
}

export type FolderType = {
    _id: string;
    name: string;
    document_type?: string; // Optional field for document type categorization
    last_modified?: Date;
  
    owner_id: string; // Reference to UserType
    shared_with?: string[]; // Array of UserType references
    access_link?: string;
    parent_folder?: string; // Reference to another FolderType for nested folders
    is_deleted?: boolean; // Flag to indicate if the folder is deleted
    deleted_at?: Date; // Timestamp when the folder was deleted
}
