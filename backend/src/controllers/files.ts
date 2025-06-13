import { Request, Response } from "express";
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
require('dotenv').config();
import { File } from "../models/file"; // Import your File model
import { console } from "inspector";
import { Readable } from 'stream';



const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});


const fileController = {
    /**
     * Upload a file and save its metadata to the database
     * @param {Request} req - The request object containing file data
     * @param {Response} res - The response object to send data back
     */
    // Hàm upload file lên S3
    uploadFile: async (req: Request, res: Response) => {
        try {
            if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                res.status(400).json({ message: "No files uploaded" });
                return;
            }

            const user_id = req.user_id;

            const parent_folder = req.body.parent_folder || null;

            const uploadResults = [];

            for (const file of req.files) {
                const now = new Date();
                const formattedTime = now
                    .toISOString()
                    .replace(/:/g, "-")
                    .replace(/\..+/, "")
                    .replace("T", "_");

                const key = `${formattedTime}_${file.originalname}`;
                const document_type = (file.originalname ?? '').split('.').pop()?.toLowerCase() ?? '';

                const newFile = new File({
                    name: file.originalname,
                    size: file.size,
                    document_type: document_type,
                    last_modified: now,
                    key: key,
                    owner_id: user_id,
                    parent_folder: parent_folder
                });

                await newFile.save();
                const file_id = newFile._id.toString();

                const uploadParams = {
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    Metadata: {
                        file_id: file_id,
                    },
                };

                await s3.send(new PutObjectCommand(uploadParams));

                uploadResults.push({ message: "Uploaded successfully", file_id });
            }

            res.status(200).json({
                message: "All files uploaded successfully",
                results: uploadResults,
            });
        } catch (err: any) {
            console.error("S3 Upload Error:", err);
            res.status(500).json({ message: "Upload failed", error: err.message });
            return;
        }
    },
    getFiles: async (req: Request, res: Response) => {
        try {
            const { parent_folder, option, searchQuery } = req.body;
            const user_id = req.user_id;

            let condition: any = {};

            // --- Điều kiện cơ bản theo option ---
            switch (option) {
                case 'owner':
                    condition.owner_id = user_id;
                    condition.parent_folder = parent_folder ?? null;
                    condition.is_deleted = false;
                    break;

                case 'shared':
                    condition.shared_with = { $in: [user_id] };
                    condition.is_deleted = false;
                    break;

                case 'trash':
                    condition.owner_id = user_id;
                    condition.is_deleted = true;
                    break;

                default:
                    res.status(400).json({ message: 'Invalid option' });
                    return;
            }

            // --- Áp dụng các bộ lọc nâng cao ---
            if (searchQuery) {
                const {
                    search_content,
                    user,
                    permission,
                    document_category,
                    document_type,
                    date_after,
                    date_before
                } = searchQuery;

                // 🔍 Tìm kiếm theo tên file
                if (search_content) {
                    condition.name = { $regex: search_content, $options: 'i' };
                }

                // 👤 Lọc theo user và quyền
                if (user && permission) {
                    const isSameUser = user === user_id;

                    if (option === 'owner') {
                        if (isSameUser) {
                            if (permission === 'Được chia sẻ với') {
                                // Không hiển thị gì vì user không thể tự chia sẻ cho chính mình
                                // → ép điều kiện sai
                                condition._id = null;
                            }
                        } else {
                            if (permission === 'Chủ sở hữu') {
                                // File do `user` sở hữu, đã chia sẻ với user_id
                                condition._id = null;
                            } else if (permission === 'Được chia sẻ với') {
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
                            } else if (permission === 'Được chia sẻ với') {
                                // File mà user_id được chia sẻ, và `user` cũng nằm trong shared_with
                                condition.shared_with = { $all: [user_id, user] };
                            }
                        }
                        // Nếu isSameUser và option === 'shared', không cần filter gì thêm — lấy tất cả file được chia sẻ với user_id
                    }
                }


                // 📁 Lọc theo loại tài liệu
                if (document_category) {
                    condition.document_category = document_category;
                }

                // 🗂 Lọc theo loại file
                if (document_type) {
                    if (document_type === "hình ảnh") {
                        condition.document_type = { $in: ["jpeg", "jpg", "png"] };
                    } else {
                        condition.document_type = document_type;
                    }
                }

                // 🕒 Lọc theo ngày chỉnh sửa
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

            const files = await File.find(condition);

            console.log("Files found:", files);
            res.status(200).json({ files });
            return;

        } catch (error: any) {
            console.error("Find File Error:", error);
            res.status(500).json({ message: "Failed to find files", error: error.message });
            return;
        }
    },

    updateFile: async (req: Request, res: Response) => {
        const { file_id } = req.params;
        const updated_data = req.body;

        try {
            const file = await File.findByIdAndUpdate(file_id, updated_data, { new: true });
            if (!file) {
                res.status(404).json({ message: "File not found" });
                return;
            }

            res.status(200).json({ message: "File updated successfully", file });
        } catch (error: any) {
            console.error("Update File Error:", error);
            res.status(500).json({ message: "Failed to update file", error: error.message });
        }
    },
    downloadFile: async (req: Request, res: Response) => {
        try {
            const { fileId } = req.params;
            console.log("Download file ID:", fileId);
            const userId = req.user_id;

            // 1. Tìm file trong DB
            const file = await File.findById(fileId);
            if (!file) {
                res.status(404).json({ message: "File not found" });
                return;
            }

            // 2. Kiểm tra quyền
            const isOwner = file.owner_id.toString() === userId;
            const isShared = file.shared_with?.some((uid: any) => uid.toString() === userId) || false;

            if (!isOwner && !isShared) {
                res.status(403).json({ message: "Access denied" });
                return;
            }

            // 3. Tạo command để lấy object từ S3
            const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME!,
                Key: file.key,
            });

            const data = await s3.send(command);

            const fileName = encodeURIComponent(file.name); // mã hóa UTF-8

            // 4. Thiết lập headers để trình duyệt tự động tải về
            res.setHeader("Content-Type", data.ContentType || "application/octet-stream");
            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`);

            if (!data.Body) {
                console.error("S3 response does not contain Body");
                res.status(500).json({ message: "No file data returned from S3" });
                return;
            }
            // 5. Stream file từ S3 về client
            if (data.Body instanceof Readable) {
                data.Body.pipe(res);
            } else {
                res.status(500).json({ message: "Unable to stream file" });
                return;
            }

        } catch (error) {
            console.error("Download file error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },
    deleteFile: async (req: Request, res: Response) => {
        const { file_id } = req.body;

        try {
            // Tìm file trong DB
            const file = await File.findByIdAndUpdate(file_id, {
                is_deleted: true,
                deleted_at: new Date()
            });
            if (!file) {
                res.status(404).json({ message: "File not found" });
                return;
            }

            res.status(200).json({ message: "Moved file to trash" });
        } catch (error: any) {
            console.error("Move file to trash Error:", error);
            res.status(500).json({ message: "Failed to move file to trash", error: error.message });
        }
    },
    recoveryFile: async (req: Request, res: Response) => {
        const { file_id } = req.body;

        try {
            // Tìm file trong DB
            let file = await File.findByIdAndUpdate(file_id, {
                is_deleted: false,
                deleted_at: null
            });
            res.status(200).json({ message: "File recovered successfully", file });
        } catch (error: any) {
            console.error("Recover File Error:", error);
            res.status(500).json({ message: "Failed to recover file", error: error.message });
        }
    },
    deleteFilePermanently: async (req: Request, res: Response) => {
        const { file_id } = req.body;

        try {
            // Tìm file trong DB
            const file = await File.findById(file_id);
            if (!file) {
                res.status(404).json({ message: "File not found" });
                return;
            }

            // Xoá file khỏi S3
            const deleteParams = {
                Bucket: process.env.S3_BUCKET_NAME!,
                Key: file.key,
            };
            await s3.send(new DeleteObjectCommand(deleteParams));

            // Xoá file khỏi DB
            await File.findByIdAndDelete(file_id);

            res.status(200).json({ message: "File deleted permanently" });
        } catch (error: any) {
            console.error("Delete File Permanently Error:", error);
            res.status(500).json({ message: "Failed to delete file permanently", error: error.message });
        }
    },
    getPresignedUrl: async (req: Request, res: Response) => {
        const { file_id } = req.body;
        const userId = req.user_id;
        try {

            // 1. Tìm file
            const file = await File.findById(file_id);
            if (!file) {
                res.status(404).json({ message: "File not found" });
                return;
            }

            // 2. Kiểm tra quyền truy cập
            const isOwner = file.owner_id.toString() === userId;
            const isShared = file.shared_with?.some((uid: any) => uid.toString() === userId) || false;

            if (!isOwner && !isShared) {
                res.status(403).json({ message: "Access denied" });
                return;
            }

            // 3. Tạo presigned URL
            const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME!,
                Key: file.key,
            });

            const url = await getSignedUrl(s3, command, { expiresIn: 60 * 10 }); // 10 phút

            res.status(200).json({ url });
            return;
        } catch (error) {
            console.error("Error generating presigned URL:", error);
            res.status(500).json({ message: "Internal server error" });
            return;
        }
    }
};

export default fileController;