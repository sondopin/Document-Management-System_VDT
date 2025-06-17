import React, { useRef, useState } from "react";
import { getUploadUrlAPI, uploadFileToS3, confirmUploadAPI } from "../apis/file.api";
import { completeFolderUploadAPI, prepareFolderUploadAPI, createFolderAPI } from "../apis/folder.api";
import { useFolder } from "../context/folder.context";
import UploadNotification from './UploadNotification';
import axios, { AxiosProgressEvent } from 'axios';

declare module 'react' {
    interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
        webkitdirectory?: string;
    }
}

export default function FileActions() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [folderName, setFolderName] = useState("Thư mục không có tiêu đề");

    const { parentFolder, refetchAll } = useFolder();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);

        for (const file of files) {
            const start = Date.now();
            try {
                // ---- BƯỚC 1: Gọi BE để lấy Presigned URL ----
                console.log(`[1/3] Getting upload URL for ${file.name}...`);
                const res = await getUploadUrlAPI(
                    file.name,
                    file.type,
                    parentFolder || null
                );

                const { uploadUrl, file_id } = res.data; // Giả sử axios trả về data trong res.data

                if (!uploadUrl) {
                    throw new Error("Could not get an upload URL.");
                }

                // ---- BƯỚC 2: Dùng URL vừa nhận để upload file thẳng lên S3 ----
                console.log(`[2/3] Uploading ${file.name} to S3...`);
                const uploadResponse = await uploadFileToS3(uploadUrl, file);

                if (!uploadResponse.ok) {
                    // Nếu upload S3 lỗi, ném ra lỗi để đi vào block catch
                    throw new Error(`S3 upload failed: ${uploadResponse.statusText}`);
                }

                // ---- BƯỚC 3 (Khuyến khích): Thông báo cho BE là đã upload xong ----
                console.log(`[3/3] Confirming upload for fileId: ${file_id}...`);
                await confirmUploadAPI(file_id, file.size);

                const end = Date.now();
                console.log(`✅ Successfully uploaded ${file.name} in ${end - start}ms`);

            } catch (error) {
                console.error(`❌ Failed to upload ${file.name}.`, error);
                // Có thể thêm logic thông báo lỗi cho người dùng ở đây
            }
        }

        // Sau khi tất cả các file đã hoàn tất (thành công hoặc thất bại), refresh lại danh sách
        refetchAll();
    };

    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);

        // --- Phần xây dựng cấu trúc folder giữ nguyên ---
        const folder_structure: any[] = [];
        const pathMap = new Map();
        // Tạo một Map để dễ dàng truy cập file object từ relativePath
        const fileMap = new Map<string, File>();

        const insertToTree = (pathParts: string[], fullPath: string) => {
            let currentLevel = folder_structure;
            let currentPath = "";

            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                const isFile = i === pathParts.length - 1 && fullPath.slice(-1) !== '/';

                if (isFile) {
                    currentLevel.push({ type: "file", name: part, path: fullPath });
                } else {
                    if (!pathMap.has(currentPath)) {
                        const folder = { type: "folder", name: part, children: [] };
                        currentLevel.push(folder);
                        pathMap.set(currentPath, folder.children);
                    }
                    currentLevel = pathMap.get(currentPath);
                }
            }
        };

        files.forEach((file) => {
            // webkitRelativePath là key định danh file duy nhất
            fileMap.set(file.webkitRelativePath, file);
            const pathParts = file.webkitRelativePath.split("/");
            insertToTree(pathParts, file.webkitRelativePath);
        });

        try {
            // ---- BƯỚC 1: Gửi cấu trúc thư mục, lấy về danh sách file cần upload ----
            console.log('[1/4] Preparing folder upload...');
            const prepareResponse = await prepareFolderUploadAPI(
                folder_structure,
                parentFolder || null
            );
            const { filesToUpload } = prepareResponse.data;
            console.log(`[2/4] Received ${filesToUpload.length} file URLs. Starting parallel upload...`);

            // ---- BƯỚC 2: Tạo các promise để upload file song song ----
            const uploadPromises = filesToUpload.map((fileToUpload: any) => {
                // Lấy file object gốc từ Map
                const file = fileMap.get(fileToUpload.relativePath);
                if (!file) {
                    console.error(`Could not find file for path: ${fileToUpload.relativePath}`);
                    // Trả về một promise đã bị từ chối
                    return Promise.reject(`File not found: ${fileToUpload.relativePath}`);
                }
                // Gọi hàm upload lên S3 và trả về promise, kèm theo kết quả cần thiết
                return uploadFileToS3(fileToUpload.uploadUrl, file)
                    .then(response => {
                        if (!response.ok) throw new Error(`S3 upload failed for ${file.name}`);
                        // Trả về dữ liệu cần cho bước xác nhận
                        return { fileId: fileToUpload.fileId, fileSize: file.size };
                    });
            });

            // ---- BƯỚC 3: Thực thi tất cả các promise upload ----
            // Promise.all sẽ chạy tất cả song song và chỉ hoàn thành khi tất cả thành công
            const completedFiles = await Promise.all(uploadPromises);
            console.log(`[3/4] All ${completedFiles.length} files uploaded to S3 successfully.`);

            // ---- BƯỚC 4: Gửi xác nhận cuối cùng đến BE ----
            if (completedFiles.length > 0) {
                console.log('[4/4] Confirming upload with backend...');
                await completeFolderUploadAPI(completedFiles);
            }

            console.log('✅ Folder upload process completed successfully!');

        } catch (error) {
            console.error('❌ An error occurred during the folder upload process:', error);
            // Thêm logic hiển thị lỗi cho người dùng
        } finally {
            // Dù thành công hay thất bại, cuối cùng cũng refresh lại dữ liệu
            refetchAll();
        }
    };


    const handleCreateFolder = async () => {
        await createFolderAPI({ name: folderName, parent_folder: parentFolder || null });
        setModalOpen(false);
        refetchAll();
    };

    return (
        <div className=" flex-row gap-4 bg-white">
            <input
                type="file"
                ref={fileInputRef}
                multiple
                hidden
                onChange={handleFileUpload}
            />
            <input
                type="file"
                ref={folderInputRef}
                multiple
                hidden
                webkitdirectory="true"
                onChange={handleFolderUpload}
            />

            <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-black rounded"
            >
                Tải tệp lên
            </button>

            <button
                onClick={() => folderInputRef.current?.click()}
                className="px-4 py-2 text-black rounded"
            >
                Tải lên thư mục
            </button>

            <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2 text-black rounded"
            >
                Thư mục mới
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white p-6 rounded-xl shadow-lg w-[300px]">
                        <h2 className="text-lg font-semibold mb-4">Thư mục mới</h2>
                        <input
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            className="border-2 border-blue-500 rounded px-2 py-1 w-full"
                        />
                        <div className="mt-4 flex justify-end gap-4">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-blue-600 hover:underline"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                className="text-blue-600 font-semibold hover:underline"
                            >
                                Tạo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
