// src/models/File.ts

import mongoose, { Schema } from 'mongoose';
import { FileType } from './types';

const FileSchema: Schema<FileType> = new Schema({
  name: { type: String, required: true },
  size: { type: Number },
  document_type: { type: String },
  document_category: { type: String ,default: 'not_classified'}, // Default to 'not_classified'
  last_modified: { type: Date, default: Date.now },
  key: { type: String, required: true, unique: true },

  owner_id: { type: String, ref: 'User', required: true },
  shared_with: { type: [String], default: [] }, // Array of user IDs with whom the file is shared
  is_public: { type: Boolean, default: false },
  parent_folder: { type: String, ref: 'Folder' },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date },
});

export const File = mongoose.model<FileType>('File', FileSchema);
