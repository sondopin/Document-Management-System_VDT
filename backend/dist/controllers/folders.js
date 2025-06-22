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
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const file_1 = require("../models/file");
const folder_1 = require("../models/folder");
const archiver_1 = __importDefault(require("archiver"));
const stream_1 = require("stream");
const path_1 = __importDefault(require("path"));
const utils_1 = require("../utils/utils");
const s3 = new client_s3_1.S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
const getAllFilesInFolder = (folderId_1, ...args_1) => __awaiter(void 0, [folderId_1, ...args_1], void 0, function* (folderId, basePath = "") {
    const folders = yield folder_1.Folder.find({ parent_folder: folderId });
    const files = yield file_1.File.find({ parent_folder: folderId }); // đổi đúng field
    let allItems = [];
    for (let file of files) {
        allItems.push({
            type: "file",
            path: `${basePath}${file.name}`,
            s3_key: file.key,
        });
    }
    for (let folder of folders) {
        const newPath = `${basePath}${folder.name}/`;
        const subItems = yield getAllFilesInFolder(folder._id.toString(), newPath);
        allItems = allItems.concat(subItems);
    }
    return allItems;
});
function getUniqueName(name, parent_folder) {
    return __awaiter(this, void 0, void 0, function* () {
        const ext = path_1.default.extname(name);
        const base = path_1.default.basename(name, ext);
        let uniqueName = name;
        let count = 1;
        while (true) {
            const isExist = yield folder_1.Folder.exists({ name: uniqueName, parent_folder });
            if (!isExist)
                break;
            uniqueName = `${base} (${count})${ext}`;
            count++;
        }
        return uniqueName;
    });
}
const folderController = {
    prepareFolderUpload: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const user_id = req.user_id;
            const folderStructure = req.body.folder_structure;
            const parent_folder = req.body.parent_folder || null;
            if (!folderStructure) {
                res.status(400).json({ message: "folder_structure is required" });
                return;
            }
            const filesToUpload = [];
            function processNode(node, parentFolderId, currentS3Path) {
                return __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c;
                    if (node.type === 'folder') {
                        const uniqueName = yield getUniqueName(node.name, parentFolderId);
                        const folderDoc = new folder_1.Folder({
                            name: uniqueName,
                            owner_id: user_id,
                            parent_folder: parentFolderId,
                        });
                        yield folderDoc.save();
                        const newFolderId = folderDoc._id.toString();
                        const newS3Path = `${currentS3Path}${node.name}/`; // Xây dựng đường dẫn S3
                        for (const child of node.children || []) {
                            yield processNode(child, newFolderId, newS3Path);
                        }
                    }
                    else if (node.type === 'file') {
                        const now = new Date();
                        const formattedTime = now
                            .toISOString()
                            .replace(/:/g, "-")
                            .replace(/\..+/, "")
                            .replace("T", "_");
                        const sanitizedFileName = (0, utils_1.sanitizeFileNamePart)(node.name);
                        const fileKey = `${currentS3Path}${formattedTime}_${sanitizedFileName}`;
                        const document_type = (_c = (_b = ((_a = node.name) !== null && _a !== void 0 ? _a : '').split('.').pop()) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== null && _c !== void 0 ? _c : '';
                        const uniqueName = yield getUniqueName(node.name, parentFolderId);
                        const fileDoc = new file_1.File({
                            name: uniqueName,
                            size: 0, // Sẽ cập nhật sau
                            document_type: document_type,
                            last_modified: new Date(),
                            key: fileKey,
                            owner_id: user_id,
                            parent_folder: parentFolderId,
                        });
                        yield fileDoc.save();
                        const file_id = fileDoc._id.toString();
                        // Tạo Presigned URL cho file này
                        const command = new client_s3_1.PutObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: fileKey,
                            Metadata: {
                                'file_id': file_id,
                            }
                        });
                        const uploadUrl = yield (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 3600 }); // Cho thời gian dài hơn vì có thể nhiều file
                        filesToUpload.push({
                            relativePath: node.path,
                            uploadUrl,
                            fileId: file_id,
                        });
                    }
                });
            }
            // Bắt đầu xử lý với parent_folder gốc và đường dẫn S3 gốc
            const rootS3Path = `${user_id}/`; // Bắt đầu đường dẫn S3 bằng user_id
            for (const rootNode of folderStructure) {
                yield processNode(rootNode, parent_folder, rootS3Path);
            }
            res.status(200).json({
                message: 'Folder structure processed. Ready for upload.',
                filesToUpload,
            });
        }
        catch (err) {
            console.error('Prepare Folder Upload Error:', err);
            res.status(500).json({ message: 'Failed to prepare folder upload', error: err.message });
        }
    }),
    completeFolderUpload: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { completedFiles } = req.body;
            if (!completedFiles || completedFiles.length === 0) {
                res.status(400).json({ message: 'No files to confirm.' });
                return;
            }
            const bulkOps = completedFiles.map(file => ({
                updateOne: {
                    filter: { _id: file.fileId },
                    update: { $set: { size: file.fileSize } },
                }
            }));
            yield file_1.File.bulkWrite(bulkOps);
            res.status(200).json({ message: 'Folder upload completed and confirmed.' });
        }
        catch (err) {
            console.error('Complete Folder Upload Error:', err);
            res.status(500).json({ message: 'Failed to confirm folder upload', error: err.message });
        }
    }),
    updateFolder: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { folder_id } = req.params;
        const updated_data = req.body;
        try {
            const user_id = req.user_id;
            const folder = yield folder_1.Folder.findOneAndUpdate({ _id: folder_id, owner_id: user_id }, updated_data, { new: true });
            if (!folder) {
                res.status(404).json({ message: "Folder not found" });
                return;
            }
            res.status(200).json({ message: "Folder updated successfully", folder });
        }
        catch (error) {
            console.error("Update Folder Error:", error);
            res.status(500).json({ message: "Failed to update folder", error: error.message });
        }
    }),
    createFolder: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const user_id = req.user_id;
            const { name, parent_folder } = req.body;
            if (!name) {
                res.status(400).json({ message: "Folder name is required" });
                return;
            }
            const uniqueName = yield getUniqueName(name, parent_folder);
            const newFolder = new folder_1.Folder({
                name: uniqueName,
                owner_id: user_id,
                parent_folder: parent_folder || null,
                shared_with: [],
            });
            yield newFolder.save();
            res.status(201).json({
                message: "Folder created successfully",
                folder: newFolder,
            });
        }
        catch (error) {
            console.error("Create Folder Error:", error);
            res.status(500).json({ message: "Failed to create folder", error: error.message });
        }
    }),
    getFolders: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { parent_folder, option, searchQuery } = req.body;
            const user_id = req.user_id;
            let condition = {};
            // Base condition by option
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
            // --- Apply advanced search filters 
            if (searchQuery) {
                const { search_content, user, permission, document_type, document_category, date_after, date_before } = searchQuery;
                // Tìm kiếm theo tên file
                if (search_content) {
                    condition.name = { $regex: search_content, $options: 'i' };
                }
                // Lọc theo user và quyền
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
                    condition.document_category = null;
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
                //  Lọc theo ngày chỉnh sửa
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
            const folders = yield folder_1.Folder.find(condition);
            res.status(200).json({ folders });
            return;
        }
        catch (error) {
            console.error("Find Folder Error:", error);
            res.status(500).json({ message: "Failed to find folders", error: error.message });
            return;
        }
    }),
    downloadFolder: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { folderId } = req.params;
            const userId = req.user_id;
            const folder = yield folder_1.Folder.findOne({ _id: folderId });
            if (!folder) {
                res.status(404).json({ message: "Folder not found" });
                return;
            }
            // Kiểm tra quyền sở hữu hoặc được chia sẻ (tuỳ theo logic bạn muốn mở rộng)
            if (folder.owner_id.toString() !== userId) {
                res.status(403).json({ message: "Access denied" });
                return;
            }
            const encodedZipName = encodeURIComponent(folder.name) + ".zip";
            res.setHeader("Content-Type", "application/zip");
            res.setHeader("Content-Disposition", `attachment; filename="${encodedZipName}"; filename*=UTF-8''${encodedZipName}`);
            const archive = (0, archiver_1.default)("zip");
            archive.pipe(res);
            const allItems = yield getAllFilesInFolder(folderId, `${folder.name}/`);
            for (const item of allItems) {
                const command = new client_s3_1.GetObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: item.s3_key,
                });
                const s3Response = yield s3.send(command);
                if (!s3Response.Body) {
                    console.warn(`Missing S3 body for: ${item.s3_key}`);
                    continue;
                }
                if (!(s3Response.Body instanceof stream_1.Readable)) {
                    console.warn("Invalid S3 Body stream");
                    continue;
                }
                archive.append(s3Response.Body, {
                    name: item.path,
                });
            }
            archive.finalize();
        }
        catch (error) {
            console.error("Download folder error:", error);
            res.status(500).json({ message: "Download folder failed" });
        }
    }),
    deleteFolder: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { folderId } = req.body;
        try {
            const folder = yield folder_1.Folder.findByIdAndUpdate(folderId, { is_deleted: true, deleted_at: new Date() });
            if (!folder) {
                res.status(404).json({ message: "Folder not found" });
                return;
            }
            res.status(200).json({ message: "Folder moved to trash successfully" });
        }
        catch (error) {
            console.error("Delete Folder Error:", error);
            res.status(500).json({ message: "Failed to delete folder", error: error.message });
        }
    }),
    recoveryFolder: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { folderId } = req.params;
        try {
            const folder = yield folder_1.Folder.findByIdAndUpdate(folderId, { is_deleted: false, deleted_at: null });
            if (!folder) {
                res.status(404).json({ message: "Folder not found" });
                return;
            }
            res.status(200).json({ message: "Folder recovered successfully", folder });
        }
        catch (error) {
            console.error("Recover Folder Error:", error);
            res.status(500).json({ message: "Failed to recover folder", error: error.message });
        }
    }),
    deleteFolderPermanently: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { folder_id } = req.body;
        const user_id = req.user_id;
        try {
            // Xác minh quyền sở hữu thư mục
            const folder = yield folder_1.Folder.findOne({ _id: folder_id, owner_id: user_id });
            if (!folder) {
                res.status(404).json({ message: "Folder not found or access denied" });
                return;
            }
            // Gọi hàm đệ quy xóa
            yield deleteFolderRecursive(folder_id);
            res.status(200).json({ message: "Folder and its contents deleted permanently" });
            return;
        }
        catch (error) {
            console.error("Delete folder permanently error:", error);
            res.status(500).json({ message: "Failed to delete folder permanently", error: error.message });
            return;
        }
    }),
    shareFolder: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { folder_id, user_share } = req.body;
        try {
            // 1. Kiểm tra folder gốc
            const rootFolder = yield folder_1.Folder.findById(folder_id);
            if (!rootFolder) {
                res.status(404).json({ message: "Folder not found" });
                return;
            }
            // 2. Đệ quy chia sẻ folder và file
            const shareRecursively = (folderId) => __awaiter(void 0, void 0, void 0, function* () {
                var _a, _b;
                const folder = yield folder_1.Folder.findById(folderId);
                if (folder) {
                    if (!((_a = folder.shared_with) === null || _a === void 0 ? void 0 : _a.includes(user_share))) {
                        folder.shared_with = [...(folder.shared_with || []), user_share];
                    }
                    yield folder.save();
                }
                // Chia sẻ các file trong folder này
                const files = yield file_1.File.find({ parent_folder: folderId });
                for (const file of files) {
                    if (!((_b = file.shared_with) === null || _b === void 0 ? void 0 : _b.includes(user_share))) {
                        file.shared_with = [...(file.shared_with || []), user_share];
                    }
                    yield file.save();
                }
                // Đệ quy với các folder con
                const subfolders = yield folder_1.Folder.find({ parent_folder: folderId });
                for (const subfolder of subfolders) {
                    yield shareRecursively(subfolder._id.toString());
                }
            });
            yield shareRecursively(folder_id);
            res.status(200).json({ message: "Folder shared successfully (recursively)" });
        }
        catch (error) {
            console.error("Share folder error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    unShareFolder: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { folder_id } = req.body;
        const user_id = req.user_id;
        try {
            const folder = yield folder_1.Folder.findById(folder_id);
            if (!folder) {
                res.status(404).json({ message: 'Không tìm thấy thư mục.' });
                return;
            }
            // Kiểm tra xem đã chia sẻ chưa
            if (Array.isArray(folder.shared_with) && folder.shared_with.includes(user_id)) {
                folder.shared_with = folder.shared_with.filter(uid => uid !== user_id);
                yield folder.save(); // Đảm bảo đã lưu
            }
            // Load lại từ DB để chắc chắn đã lưu
            const updatedFolder = yield folder_1.Folder.findById(folder_id);
            res.status(200).json({
                message: 'Hủy chia sẻ thư mục thành công.',
                shared_with: updatedFolder === null || updatedFolder === void 0 ? void 0 : updatedFolder.shared_with,
            });
            return;
        }
        catch (error) {
            console.error('Lỗi khi hủy chia sẻ thư mục:', error);
            res.status(500).json({ message: 'Lỗi server khi hủy chia sẻ thư mục.' });
            return;
        }
    })
};
const deleteFolderRecursive = (folderId) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Tìm tất cả thư mục con
    const subfolders = yield folder_1.Folder.find({ parent_folder: folderId });
    // 2. Đệ quy xóa các thư mục con
    for (const subfolder of subfolders) {
        yield deleteFolderRecursive(subfolder._id.toString());
    }
    // 3. Tìm và xóa tất cả file trong thư mục hiện tại
    const files = yield file_1.File.find({ parent_folder: folderId });
    for (const file of files) {
        // Xóa file trên S3
        if (file.key) {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: file.key,
            });
            yield s3.send(command);
        }
        // Xóa record trong DB
        yield file_1.File.findByIdAndDelete(file._id);
    }
    // 4. Xóa thư mục hiện tại
    yield folder_1.Folder.findByIdAndDelete(folderId);
});
exports.default = folderController;
