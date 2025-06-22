"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const file_1 = require("../models/file");
const folder_1 = require("../models/folder");
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
// Chạy lúc 3h sáng hàng ngày
node_cron_1.default.schedule("0 3 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    const expiredDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldFiles = yield file_1.File.find({
        is_deleted: true,
        deleted_at: { $lte: expiredDate }
    });
    for (const file of oldFiles) {
        if (file.key) {
            yield s3.send(new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: file.key,
            }));
        }
        yield file_1.File.findByIdAndDelete(file._id);
    }
    const oldFolders = yield folder_1.Folder.find({
        is_deleted: true,
        deleted_at: { $lte: expiredDate }
    });
    for (const folder of oldFolders) {
        yield folder_1.Folder.findByIdAndDelete(folder._id);
    }
    console.log(`[CRON] Deleted ${oldFiles.length} expired files`);
}));
