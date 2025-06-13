import { Request, Response } from "express";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { File } from "../models/file";
import { Folder } from "../models/folder";
import archiver from "archiver";
import { Readable } from "stream";

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



const folderController = {
    uploadFolder: async (req: Request, res: Response) => {
        try {
            const user_id = req.user_id;
            const folderStructure = JSON.parse(req.body.folder_structure);
            const parent_folder = req.body.parent_folder || null; // thư mục cha gốc

            const fileMap: Map<string, Express.Multer.File> = new Map();
            if (Array.isArray(req.files)) {
                for (const file of req.files as Express.Multer.File[]) {
                    fileMap.set(file.originalname, file);
                }
            }

            const allFolderIds: string[] = [];

            // Hàm xử lý đệ quy folder & file
            async function processNode(node: any, parentFolderId: string | null, currentPath: string) {
                if (node.type === 'folder') {
                    const folderDoc = new Folder({
                        name: node.name,
                        owner_id: user_id,
                        parent_folder: parentFolderId,
                        files: [],
                    });
                    await folderDoc.save();
                    allFolderIds.push(folderDoc._id.toString());

                    // Đệ quy children nếu có
                    for (const child of node.children || []) {
                        await processNode(child, folderDoc._id.toString(), `${currentPath}/${node.name}`);
                    }
                } else if (node.type === 'file') {
                    const fileKey = `${Date.now()}_${node.name}`;
                    const fileName = node.name;
                    const matchedFile = [...fileMap.values()].find(f => f.originalname === fileName);

                    if (!matchedFile) {
                        console.warn(`Không tìm thấy file '${fileName}' từ FE`);
                        return;
                    }

                    const document_type = (matchedFile.originalname ?? '').split('.').pop()?.toLowerCase() ?? '';


                    const fileDoc = new File({
                        name: matchedFile.originalname,
                        size: matchedFile.size,
                        document_type: document_type,
                        last_modified: new Date(),
                        key: fileKey,
                        owner_id: user_id,
                        parent_folder: parentFolderId || null,
                    });

                    await s3.send(new PutObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: fileKey,
                        Body: matchedFile.buffer,
                        ContentType: matchedFile.mimetype,
                        Metadata: {
                            file_id: fileDoc._id.toString(),
                        },
                    }));

                    await fileDoc.save();
                }
            }

            // Bắt đầu xử lý từng node gốc với parent_folder đã truyền
            for (const rootNode of folderStructure) {
                await processNode(rootNode, parent_folder, '');
            }

            res.status(200).json({
                message: 'Folder structure uploaded successfully',
                folder_ids: allFolderIds,
            });

        } catch (err: any) {
            console.error('Upload Folder Error:', err);
            res.status(500).json({ message: 'Upload failed', error: err.message });
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

            const newFolder = new Folder({
                name,
                owner_id: user_id,
                parent_folder: parent_folder || null, // vì là thư mục gốc
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
                    break;

                case 'trash':
                    condition.owner_id = user_id;
                    condition.is_deleted = true;
                    break;

                default:
                    res.status(400).json({ message: 'Invalid option' });
                    return;
            }

            // --- Apply advanced search filters ---
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

                // 🔍 Tìm kiếm theo tên
                if (search_content) {
                    condition.name = { $regex: search_content, $options: 'i' };
                }

                // 👥 Lọc theo user và quyền
                if (user && permission) {
                    if (option === 'owner') {
                        if (permission === 'shared') {
                            // Tìm file owner là user hiện tại, được chia sẻ với 'user'
                            condition.shared_with = { $in: [user] };
                        }
                        // Nếu permission === 'owner' thì không cần lọc gì thêm (vì user hiện tại đã là owner)
                    }

                    if (option === 'shared') {
                        if (permission === 'owner') {
                            // Lọc các file mà user là owner
                            condition.owner_id = user;
                        }
                        // Nếu permission === 'shared' thì mặc định user hiện tại đang là người được chia sẻ
                        // => không cần điều kiện gì thêm
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

                // 📅 Lọc theo ngày chỉnh sửa
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
