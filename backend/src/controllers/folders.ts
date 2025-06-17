import { Request, Response } from "express";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { File } from "../models/file";
import { Folder } from "../models/folder";
import archiver from "archiver";
import { Readable } from "stream";
import path from "path";
import { sanitizeFileNamePart } from "../utils/utils";

const s3 = new S3Client({
    region: process.env.AWS_REGION as string,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    }
});


const getAllFilesInFolder = async (
    folderId: string,
    basePath: string = ""
): Promise<{ type: "file"; path: string; s3_key: string }[]> => {
    const folders = await Folder.find({ parent_folder: folderId });
    const files = await File.find({ parent_folder: folderId }); // đổi đúng field

    let allItems: { type: "file"; path: string; s3_key: string }[] = [];

    for (let file of files) {
        allItems.push({
            type: "file",
            path: `${basePath}${file.name}`,
            s3_key: file.key,
        });
    }

    for (let folder of folders) {
        const newPath = `${basePath}${folder.name}/`;
        const subItems = await getAllFilesInFolder(folder._id.toString(), newPath);
        allItems = allItems.concat(subItems);
    }

    return allItems;
};

async function getUniqueName(name: string, parent_folder: string | null): Promise<string> {
    const ext = path.extname(name); 
    const base = path.basename(name, ext);

    let uniqueName = name;
    let count = 1;

    while (true) {
        const isExist = await Folder.exists({ name: uniqueName, parent_folder });

        if (!isExist) break;

        uniqueName = `${base} (${count})${ext}`;
        count++;
    }

    return uniqueName;
}


const folderController = {
    prepareFolderUpload: async (req: Request, res: Response) => {
        try {
            const user_id = req.user_id;
            const folderStructure = req.body.folder_structure;
            const parent_folder = req.body.parent_folder || null;

            if (!folderStructure) {
                res.status(400).json({ message: "folder_structure is required" });
                return;
            }

            const filesToUpload: { relativePath: string, uploadUrl: string, fileId: string }[] = [];

            async function processNode(node: any, parentFolderId: string | null, currentS3Path: string) {
                if (node.type === 'folder') {
                    const uniqueName = await getUniqueName(node.name, parentFolderId);
                    const folderDoc = new Folder({
                        name: uniqueName,
                        owner_id: user_id,
                        parent_folder: parentFolderId,
                    });
                    await folderDoc.save();
                    const newFolderId = folderDoc._id.toString();
                    const newS3Path = `${currentS3Path}${node.name}/`; // Xây dựng đường dẫn S3

                    for (const child of node.children || []) {
                        await processNode(child, newFolderId, newS3Path);
                    }
                }

                else if (node.type === 'file') {
                    const now = new Date();
                    const formattedTime = now
                        .toISOString()
                        .replace(/:/g, "-")
                        .replace(/\..+/, "")
                        .replace("T", "_");
                    
                    const sanitizedFileName = sanitizeFileNamePart(node.name);
                    const fileKey = `${currentS3Path}${formattedTime}_${sanitizedFileName}`;

                    const document_type = (node.name ?? '').split('.').pop()?.toLowerCase() ?? '';
                    const uniqueName = await getUniqueName(node.name, parentFolderId); 


                    const fileDoc = new File({
                        name: uniqueName,
                        size: 0, // Sẽ cập nhật sau
                        document_type: document_type,
                        last_modified: new Date(),
                        key: fileKey,
                        owner_id: user_id,
                        parent_folder: parentFolderId,
                    });
                    await fileDoc.save();
                    const file_id = fileDoc._id.toString();

                    // Tạo Presigned URL cho file này
                    const command = new PutObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: fileKey,
                        Metadata: {
                            'file_id': file_id, 
                        }
                    });
                    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // Cho thời gian dài hơn vì có thể nhiều file

                    filesToUpload.push({
                        relativePath: node.path, 
                        uploadUrl,
                        fileId: file_id,
                    });
                }
            }

            // Bắt đầu xử lý với parent_folder gốc và đường dẫn S3 gốc
            const rootS3Path = `${user_id}/`; // Bắt đầu đường dẫn S3 bằng user_id
            for (const rootNode of folderStructure) {
                await processNode(rootNode, parent_folder, rootS3Path);
            }

            res.status(200).json({
                message: 'Folder structure processed. Ready for upload.',
                filesToUpload,
            });

        } catch (err: any) {
            console.error('Prepare Folder Upload Error:', err);
            res.status(500).json({ message: 'Failed to prepare folder upload', error: err.message });
        }
    },

    completeFolderUpload: async (req: Request, res: Response) => {
        try {
            const { completedFiles }: { completedFiles: { fileId: string, fileSize: number }[] } = req.body;

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

            await File.bulkWrite(bulkOps);

            res.status(200).json({ message: 'Folder upload completed and confirmed.' });

        } catch (err: any) {
            console.error('Complete Folder Upload Error:', err);
            res.status(500).json({ message: 'Failed to confirm folder upload', error: err.message });
        }
    },
    updateFolder: async (req: Request, res: Response) => {
        const { folder_id } = req.params;
        const updated_data = req.body;
        try {
            const user_id = req.user_id;

            const folder = await Folder.findOneAndUpdate({ _id: folder_id, owner_id: user_id }, updated_data, { new: true });
            if (!folder) {
                res.status(404).json({ message: "Folder not found" });
                return;
            }

            res.status(200).json({ message: "Folder updated successfully", folder });
        } catch (error: any) {
            console.error("Update Folder Error:", error);
            res.status(500).json({ message: "Failed to update folder", error: error.message });
        }
    },
    createFolder: async (req: Request, res: Response) => {
        try {
            const user_id = req.user_id;
            const { name, parent_folder } = req.body;

            if (!name) {
                res.status(400).json({ message: "Folder name is required" });
                return;
            }
            const uniqueName = await getUniqueName(name, parent_folder);
            const newFolder = new Folder({
                name: uniqueName,
                owner_id: user_id,
                parent_folder: parent_folder || null,
                shared_with: [],
                is_public: false,
            });

            await newFolder.save();

            res.status(201).json({
                message: "Folder created successfully",
                folder: newFolder,
            });
        } catch (error: any) {
            console.error("Create Folder Error:", error);
            res.status(500).json({ message: "Failed to create folder", error: error.message });
        }
    },
    getFolders: async (req: Request, res: Response) => {
        try {
            const { parent_folder, option, searchQuery } = req.body;
            const user_id = req.user_id;

            let condition: any = {};

            // Base condition by option
            switch (option) {
                case 'owner':
                    condition.owner_id = user_id;
                    condition.parent_folder = parent_folder ?? null;
                    condition.is_deleted = false;
                    break;

                case 'shared':
                    condition.shared_with = { $in: [user_id] };
                    condition.is_deleted = false;
                    condition.parent_folder = parent_folder ?? null;
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
                const {
                    search_content,
                    user,
                    permission,
                    document_type,
                    document_category,
                    date_after,
                    date_before
                } = searchQuery;

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

                // Lọc theo loại tài liệu
                if (document_category) {
                    condition.document_category = null;
                }

                // Lọc theo loại file
                if (document_type) {
                    if (document_type === "hình ảnh") {
                        condition.document_type = { $in: ["jpeg", "jpg", "png"] };
                    } else {
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

            const folders = await Folder.find(condition);

            res.status(200).json({ folders });
            return;
        } catch (error: any) {
            console.error("Find Folder Error:", error);
            res.status(500).json({ message: "Failed to find folders", error: error.message });
            return;
        }
    },

    downloadFolder: async (req: Request, res: Response) => {
        try {
            const { folderId } = req.params;
            const userId = req.user_id;

            const folder = await Folder.findOne({ _id: folderId });
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
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${encodedZipName}"; filename*=UTF-8''${encodedZipName}`
            );

            const archive = archiver("zip");
            archive.pipe(res);

            const allItems = await getAllFilesInFolder(folderId, `${folder.name}/`);

            for (const item of allItems) {
                const command = new GetObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME!,
                    Key: item.s3_key,
                });

                const s3Response = await s3.send(command);
                if (!s3Response.Body) {
                    console.warn(`Missing S3 body for: ${item.s3_key}`);
                    continue;
                }
                if (!(s3Response.Body instanceof Readable)) {
                    console.warn("Invalid S3 Body stream");
                    continue;
                }

                archive.append(s3Response.Body as Readable, {
                    name: item.path,
                });
            }

            archive.finalize();

        } catch (error) {
            console.error("Download folder error:", error);
            res.status(500).json({ message: "Download folder failed" });
        }
    },


    deleteFolder: async (req: Request, res: Response) => {
        const { folderId } = req.body;
        try {
            const folder = await Folder.findByIdAndUpdate(
                folderId, { is_deleted: true, deleted_at: new Date() }
            );
            if (!folder) {
                res.status(404).json({ message: "Folder not found" });
                return;
            }
            res.status(200).json({ message: "Folder moved to trash successfully" });
        } catch (error: any) {
            console.error("Delete Folder Error:", error);
            res.status(500).json({ message: "Failed to delete folder", error: error.message });
        }
    },
    recoveryFolder: async (req: Request, res: Response): Promise<void> => {
        const { folderId } = req.params;
        try {
            const folder = await Folder.findByIdAndUpdate(
                folderId, { is_deleted: false, deleted_at: null }
            );
            if (!folder) {
                res.status(404).json({ message: "Folder not found" });
                return;
            }
            res.status(200).json({ message: "Folder recovered successfully", folder });
        } catch (error: any) {
            console.error("Recover Folder Error:", error);
            res.status(500).json({ message: "Failed to recover folder", error: error.message });
        }
    },
    deleteFolderPermanently: async (req: Request, res: Response) => {
        const { folder_id } = req.body;
        const user_id = req.user_id;
        try {

            // Xác minh quyền sở hữu thư mục
            const folder = await Folder.findOne({ _id: folder_id, owner_id: user_id });
            if (!folder) {
                res.status(404).json({ message: "Folder not found or access denied" });
                return;
            }

            // Gọi hàm đệ quy xóa
            await deleteFolderRecursive(folder_id);

            res.status(200).json({ message: "Folder and its contents deleted permanently" });
            return;
        } catch (error: any) {
            console.error("Delete folder permanently error:", error);
            res.status(500).json({ message: "Failed to delete folder permanently", error: error.message });
            return;
        }
    },
    shareFolder: async (req: Request, res: Response) => {
        const { folder_id, user_share } = req.body;

        try {
            // 1. Kiểm tra folder gốc
            const rootFolder = await Folder.findById(folder_id);
            if (!rootFolder) {
                res.status(404).json({ message: "Folder not found" });
                return;
            }

            // 2. Đệ quy chia sẻ folder và file
            const shareRecursively = async (folderId: string) => {
                const folder = await Folder.findById(folderId);
                if (folder) {
                    if (!folder.shared_with?.includes(user_share)) {
                        folder.shared_with = [...(folder.shared_with || []), user_share];
                    }
                    await folder.save();
                }

                // Chia sẻ các file trong folder này
                const files = await File.find({ parent_folder: folderId });
                for (const file of files) {
                    if (!file.shared_with?.includes(user_share)) {
                        file.shared_with = [...(file.shared_with || []), user_share];
                    }
                    await file.save();
                }

                // Đệ quy với các folder con
                const subfolders = await Folder.find({ parent_folder: folderId });
                for (const subfolder of subfolders) {
                    await shareRecursively(subfolder._id.toString());
                }
            };

            await shareRecursively(folder_id);

            res.status(200).json({ message: "Folder shared successfully (recursively)" });
        } catch (error) {
            console.error("Share folder error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }

};


const deleteFolderRecursive = async (folderId: string) => {
    // 1. Tìm tất cả thư mục con
    const subfolders = await Folder.find({ parent_folder: folderId });

    // 2. Đệ quy xóa các thư mục con
    for (const subfolder of subfolders) {
        await deleteFolderRecursive(subfolder._id.toString());
    }

    // 3. Tìm và xóa tất cả file trong thư mục hiện tại
    const files = await File.find({ parent_folder: folderId });
    for (const file of files) {
        // Xóa file trên S3
        if (file.key) {
            const command = new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME!,
                Key: file.key,
            });
            await s3.send(command);
        }

        // Xóa record trong DB
        await File.findByIdAndDelete(file._id);
    }

    // 4. Xóa thư mục hiện tại
    await Folder.findByIdAndDelete(folderId);
};


export default folderController;
