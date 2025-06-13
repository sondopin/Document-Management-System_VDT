export interface Folder {
    _id: string;
    name: string;
    last_modified?: Date;
    document_type?: string; // Optional field for document type categorization
    
    owner_id: string; // Reference to UserType
    shared_with?: string[]; // Array of UserType references
    is_public?: boolean;
    access_link?: string;
    parent_folder?: string; // Reference to another FolderType for nested folders
    is_deleted?: boolean; // Flag to indicate if the folder is deleted
    deleted_at?: Date; // Timestamp when the folder was deleted
}
export type Folders = Folder[];

