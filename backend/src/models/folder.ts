import mongoose , {Schema} from "mongoose";
import { FolderType } from "./types";

const FolderSchema: Schema<FolderType> = new Schema({        
  name: { type: String, required: true }, // Name of the folder, required field
  last_modified: { type: Date, default: Date.now }, // Timestamp when the folder was created, default is current date
  document_type: { type: String, default: 'folder' }, // Optional field for document type categorization
  owner_id: { type: String, ref: 'User', required: true }, // Reference to UserType
  shared_with: { type: [String], default: [] }, // Array of UserType references
  parent_folder: { type: String, ref: 'Folder' }, // Reference to another FolderType for nested folders
  is_deleted: { type: Boolean, default: false }, // Flag to indicate if the folder is deleted, default is false
  deleted_at: { type: Date }, // Timestamp when the folder was deleted
});

export const Folder = mongoose.model<FolderType>('Folder', FolderSchema);