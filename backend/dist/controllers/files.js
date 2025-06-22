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
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
require('dotenv').config();
const file_1 = require("../models/file"); // Import your File model
const inspector_1 = require("inspector");
const path_1 = __importDefault(require("path"));
const utils_1 = require("../utils/utils");
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
const fileController = {
    // Hàm upload file lên S3
    generateUploadUrl: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            const { fileName, fileType, parent_folder = null } = req.body;
            if (!fileName || !fileType) {
                res.status(400).json({ message: "fileName and fileType are required" });
                return;
            }
            const user_id = req.user_id;
            const now = new Date();
            const formattedTime = now
                .toISOString()
                .replace(/:/g, "-")
                .replace(/\..+/, "")
                .replace("T", "_");
            const sanitizedFileName = (0, utils_1.sanitizeFileNamePart)(fileName);
            const key = `${user_id}/${formattedTime}_${sanitizedFileName}`; // Thêm user_id vào key để tránh trùng lặp giữa các user
            const document_type = (_b = (_a = (fileName !== null && fileName !== void 0 ? fileName : '').split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== null && _b !== void 0 ? _b : '';
            const uniqueName = yield getUniqueName(fileName, parent_folder);
            const newFile = new file_1.File({
                name: uniqueName,
                size: 0,
                document_type: document_type,
                last_modified: now,
                key: key,
                owner_id: user_id,
                parent_folder: parent_folder,
            });
            yield newFile.save();
            const file_id = newFile._id.toString();
            // Tạo Presigned URL thay vì upload trực tiếp 
            const command = new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: key,
                ContentType: fileType,
                Metadata: {
                    file_id: file_id,
                },
            });
            // Tạo URL có chữ ký, hết hạn sau 5 phút 
            const uploadUrl = yield (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 300 });
            res.status(200).json({
                message: "Presigned URL generated successfully",
                uploadUrl, // Gửi URL này về cho FE
                file_id, // Gửi kèm file_id để FE biết đang upload cho file nào
                key // Gửi key về để FE có thể dùng cho bước confirm
            });
        }
        catch (err) {
            inspector_1.console.error("Generate URL Error:", err);
            res.status(500).json({ message: "Failed to generate upload URL", error: err.message });
        }
    }),
    confirmUpload: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { file_id, fileSize } = req.body;
            yield file_1.File.findByIdAndUpdate(file_id, {
                size: fileSize,
            });
            res.status(200).json({ message: "File upload confirmed" });
        }
        catch (err) {
            res.status(500).json({ message: "Failed to confirm upload", error: err.message });
        }
    }),
    getFiles: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { parent_folder, option, searchQuery } = req.body;
            const user_id = req.user_id;
            let condition = {};
            //  Điều kiện cơ bản theo option
            switch (option) {
                case 'owner':
                    condition.owner_id = user_id;
                    condition.parent_folder = parent_folder !== null && parent_folder !== void 0 ? parent_folder : null;
                    condition.is_deleted = false;
                    break;
                case 'shared':
                    condition.shared_with = { $in: [user_id] };
                    condition.is_deleted = false;
                    condition.parent_folder = parent_folder !== null && parent_folder !== void 0 ? parent_folder : null;
                    break;
                case 'trash':
                    condition.owner_id = user_id;
                    condition.is_deleted = true;
                    break;
                default:
                    res.status(400).json({ message: 'Invalid option' });
                    return;
            }
            //  Áp dụng các bộ lọc nâng cao 
            if (searchQuery) {
                const { search_content, user, permission, document_category, document_type, date_after, date_before } = searchQuery;
                // Tìm kiếm theo tên file
                if (search_content) {
                    condition.name = { $regex: search_content, $options: 'i' };
                }
                //  Lọc theo user và quyền
                if (user && permission) {
                    const isSameUser = user === user_id;
                    if (option === 'owner') {
                        if (isSameUser) {
                            if (permission === 'Được chia sẻ với') {
                                // Không hiển thị gì vì user không thể tự chia sẻ cho chính mình
                                // → ép điều kiện sai
                                condition._id = null;
                            }
                        }
                        else {
                            if (permission === 'Chủ sở hữu') {
                                // File do `user` sở hữu, đã chia sẻ với user_id
                                condition._id = null;
                            }
                            else if (permission === 'Được chia sẻ với') {
                                // File do user_id sở hữu, đã chia sẻ với `user`
                                condition.shared_with = { $in: [user] };
                            }
                        }
                    }
                    if (option === 'shared') {
                        if (!isSameUser) {
                            if (permission === 'Chủ sở hữu') {
                                // File do `user` sở hữu, đã chia sẻ với user_id
                                condition.owner_id = user;
                                condition.shared_with = { $in: [user_id] };
                            }
                            else if (permission === 'Được chia sẻ với') {
                                // File mà user_id được chia sẻ, và `user` cũng nằm trong shared_with
                                condition.shared_with = { $all: [user_id, user] };
                            }
                        }
                        // Nếu isSameUser và option === 'shared', không cần filter gì thêm — lấy tất cả file được chia sẻ với user_id
                    }
                }
                // Lọc theo loại tài liệu
                if (document_category) {
                    condition.document_category = document_category;
                }
                // Lọc theo loại file
                if (document_type) {
                    if (document_type === "hình ảnh") {
                        condition.document_type = { $in: ["jpeg", "jpg", "png"] };
                    }
                    else {
                        condition.document_type = document_type;
                    }
                }
                // Lọc theo ngày chỉnh sửa
                if (date_after || date_before) {
                    condition.last_modified = {};
                    if (date_after) {
                        condition.last_modified.$gte = new Date(date_after);
                    }
                    if (date_before) {
                        condition.last_modified.$lte = new Date(date_before);
                    }
                }
            }
            const files = yield file_1.File.find(condition);
            inspector_1.console.log("Files found:", files);
            res.status(200).json({ files });
            return;
        }
        catch (error) {
            inspector_1.console.error("Find File Error:", error);
            res.status(500).json({ message: "Failed to find files", error: error.message });
            return;
        }
    }),
    updateFile: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { file_id } = req.params;
        const updated_data = req.body;
        try {
            const file = yield file_1.File.findByIdAndUpdate(file_id, updated_data, { new: true });
            if (!file) {
                res.status(404).json({ message: "File not found" });
                return;
            }
            res.status(200).json({ message: "File updated successfully", file });
        }
        catch (error) {
            inspector_1.console.error("Update File Error:", error);
            res.status(500).json({ message: "Failed to update file", error: error.message });
        }
    }),
    downloadFile: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const { fileId } = req.params;
            inspector_1.console.log("Request to download file ID:", fileId);
            const userId = req.user_id; // Đảm bảo req.user_id tồn tại từ middleware xác thực
            // 1. Tìm file trong DB
            const file = yield file_1.File.findById(fileId);
            if (!file) {
                res.status(404).json({ message: "File not found" });
                return;
            }
            // 2. Kiểm tra quyền
            const isOwner = file.owner_id.toString() === userId;
            const isShared = ((_a = file.shared_with) === null || _a === void 0 ? void 0 : _a.some((uid) => uid.toString() === userId)) || false;
            if (!isOwner && !isShared) {
                res.status(403).json({ message: "Access denied" });
                return;
            }
            // 3. Tạo command để lấy object từ S3 và tạo Pre-signed URL
            const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: file.key,
                ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.name)}"; filename*=UTF-8''${encodeURIComponent(file.name)}`
            });
            // Thời gian hiệu lực của URL (ví dụ: 5 phút)
            const expiresIn = 300; // seconds
            const signedUrl = yield (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: expiresIn });
            // 4. Trả về Pre-signed URL và tên file cho Frontend
            // Frontend sẽ sử dụng URL này để tải trực tiếp từ S3
            res.status(200).json({
                url: signedUrl,
                fileName: file.name,
                // contentType: file.contentType || "application/octet-stream" // Nếu bạn lưu contentType trong DB
            });
        }
        catch (error) {
            inspector_1.console.error("Error generating pre-signed URL:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    deleteFile: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { file_id } = req.body;
        try {
            // Tìm file trong DB
            const file = yield file_1.File.findByIdAndUpdate(file_id, {
                is_deleted: true,
                deleted_at: new Date()
            });
            if (!file) {
                res.status(404).json({ message: "File not found" });
                return;
            }
            res.status(200).json({ message: "Moved file to trash" });
        }
        catch (error) {
            inspector_1.console.error("Move file to trash Error:", error);
            res.status(500).json({ message: "Failed to move file to trash", error: error.message });
        }
    }),
    recoveryFile: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { file_id } = req.body;
        try {
            // Tìm file trong DB
            let file = yield file_1.File.findByIdAndUpdate(file_id, {
                is_deleted: false,
                deleted_at: null
            });
            res.status(200).json({ message: "File recovered successfully", file });
        }
        catch (error) {
            inspector_1.console.error("Recover File Error:", error);
            res.status(500).json({ message: "Failed to recover file", error: error.message });
        }
    }),
    deleteFilePermanently: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { file_id } = req.body;
        try {
            // Tìm file trong DB
            const file = yield file_1.File.findById(file_id);
            if (!file) {
                res.status(404).json({ message: "File not found" });
                return;
            }
            // Xoá file khỏi S3
            const deleteParams = {
                Bucket: process.env.S3_BUCKET_NAME,
                Key: file.key,
            };
            yield s3.send(new DeleteObjectCommand(deleteParams));
            // Xoá file khỏi DB
            yield file_1.File.findByIdAndDelete(file_id);
            res.status(200).json({ message: "File deleted permanently" });
        }
        catch (error) {
            inspector_1.console.error("Delete File Permanently Error:", error);
            res.status(500).json({ message: "Failed to delete file permanently", error: error.message });
        }
    }),
    getPresignedUrl: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const { file_id } = req.body;
        const userId = req.user_id;
        try {
            // 1. Tìm file
            const file = yield file_1.File.findById(file_id);
            if (!file) {
                res.status(404).json({ message: "File not found" });
                return;
            }
            file.last_modified = new Date(); // Cập nhật thời gian sửa đổi
            yield file.save(); // Lưu lại thay đổi
            // 2. Kiểm tra quyền truy cập
            const isOwner = file.owner_id.toString() === userId;
            const isShared = ((_a = file.shared_with) === null || _a === void 0 ? void 0 : _a.some((uid) => uid.toString() === userId)) || false;
            if (!isOwner && !isShared) {
                res.status(403).json({ message: "Access denied" });
                return;
            }
            // 3. Tạo presigned URL
            const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: file.key,
                ResponseContentDisposition: 'inline'
            });
            const url = yield (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 60 * 10 }); // 10 phút
            res.status(200).json({ url });
            return;
        }
        catch (error) {
            inspector_1.console.error("Error generating presigned URL:", error);
            res.status(500).json({ message: "Internal server error" });
            return;
        }
    }),
    shareFile: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { file_id, user_share } = req.body;
            if (!file_id || !user_share) {
                res.status(400).json({ message: 'file_id và user_share là bắt buộc.' });
                return;
            }
            const file = yield file_1.File.findById(file_id);
            if (!file) {
                res.status(404).json({ message: 'Không tìm thấy file.' });
                return;
            }
            // Kiểm tra xem đã chia sẻ chưa
            if (!Array.isArray(file.shared_with)) {
                file.shared_with = [];
            }
            if (!file.shared_with.includes(user_share)) {
                file.shared_with.push(user_share);
                yield file.save(); // Đảm bảo đã lưu
            }
            // Load lại từ DB để chắc chắn đã lưu
            const updatedFile = yield file_1.File.findById(file_id);
            res.status(200).json({
                message: 'Chia sẻ file thành công.',
                shared_with: updatedFile === null || updatedFile === void 0 ? void 0 : updatedFile.shared_with,
            });
            return;
        }
        catch (error) {
            inspector_1.console.error('Lỗi khi chia sẻ file:', error);
            res.status(500).json({ message: 'Lỗi server khi chia sẻ file.' });
            return;
        }
    }),
    unShareFile: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { file_id } = req.body;
            const user_id = req.user_id;
            if (!file_id) {
                res.status(400).json({ message: 'file_id là bắt buộc.' });
                return;
            }
            const file = yield file_1.File.findById(file_id);
            if (!file) {
                res.status(404).json({ message: 'Không tìm thấy file.' });
                return;
            }
            // Kiểm tra xem đã chia sẻ chưa
            if (Array.isArray(file.shared_with) && file.shared_with.includes(user_id)) {
                file.shared_with = file.shared_with.filter(uid => uid !== user_id);
                yield file.save(); // Đảm bảo đã lưu
            }
            // Load lại từ DB để chắc chắn đã lưu
            const updatedFile = yield file_1.File.findById(file_id);
            res.status(200).json({
                message: 'Hủy chia sẻ file thành công.',
                shared_with: updatedFile === null || updatedFile === void 0 ? void 0 : updatedFile.shared_with,
            });
            return;
        }
        catch (error) {
            inspector_1.console.error('Lỗi khi hủy chia sẻ file:', error);
            res.status(500).json({ message: 'Lỗi server khi hủy chia sẻ file.' });
            return;
        }
    })
};
function getUniqueName(name, parent_folder) {
    return __awaiter(this, void 0, void 0, function* () {
        const ext = path_1.default.extname(name); // lấy .pdf
        const base = path_1.default.basename(name, ext); // lấy file (không có .pdf)
        let uniqueName = name;
        let count = 1;
        while (true) {
            const isExist = yield file_1.File.exists({ name: uniqueName, parent_folder });
            if (!isExist)
                break;
            uniqueName = `${base} (${count})${ext}`;
            count++;
        }
        return uniqueName;
    });
}
exports.default = fileController;
