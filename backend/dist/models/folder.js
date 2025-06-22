"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Folder = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const FolderSchema = new mongoose_1.Schema({
    name: { type: String, required: true }, // Name of the folder, required field
    last_modified: { type: Date, default: Date.now }, // Timestamp when the folder was created, default is current date
    document_type: { type: String, default: 'folder' }, // Optional field for document type categorization
    owner_id: { type: String, ref: 'User', required: true }, // Reference to UserType
    shared_with: { type: [String], default: [] }, // Array of UserType references
    parent_folder: { type: String, ref: 'Folder' }, // Reference to another FolderType for nested folders
    is_deleted: { type: Boolean, default: false }, // Flag to indicate if the folder is deleted, default is false
    deleted_at: { type: Date }, // Timestamp when the folder was deleted
});
exports.Folder = mongoose_1.default.model('Folder', FolderSchema);
