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
exports.File = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const FileSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    size: { type: Number },
    document_type: { type: String },
    document_category: { type: String, default: 'not_classified' }, // Default to 'not_classified'
    last_modified: { type: Date, default: Date.now },
    key: { type: String, required: true, unique: true },
    owner_id: { type: String, ref: 'User', required: true },
    shared_with: { type: [String], default: [] }, // Array of user IDs with whom the file is shared
    parent_folder: { type: String, ref: 'Folder' },
    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date },
});
exports.File = mongoose_1.default.model('File', FileSchema);
