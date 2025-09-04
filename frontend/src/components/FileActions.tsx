import React, { useRef, useState } from "react";
import { getUploadUrlAPI, uploadFileToS3WithProgress, confirmUploadAPI } from "../apis/file.api";
import { completeFolderUploadAPI, prepareFolderUploadAPI, createFolderAPI } from "../apis/folder.api";
import { useFolder } from "../context/folder.context";
import { UploadingFile } from "../types/file.type";

import { UploadService } from '../apis/file.api';

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

    const { parentFolder, refetchAll, uploadingFiles, setUploadingFiles, setShowProgress } = useFolder();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);

        if (files.length > 0) {
            setShowProgress(true);
        }

        // Tạo danh sách file ban đầu cho UI
        const newUploads: UploadingFile[] = files.map(file => ({
            id: `${file.name}-${Date.now()}`, // Tạo ID tạm thời
            name: file.name,
            progress: 0,
            status: 'uploading',
            type: (file.name ?? '').split('.').pop()?.toLowerCase() ?? '',
        }));
        setUploadingFiles([...uploadingFiles, ...newUploads]);

        for (const file of files) {
            const start = Date.now();
            const tempId = newUploads.find(f => f.name === file.name)!.id;
            try {
                console.log(`[1/3] Getting upload URL for ${file.name}...`);
                const res = await getUploadUrlAPI(
                    file.name,
                    file.type,
                    parentFolder || null
                );

                const { uploadUrl, file_id } = res.data;

                if (!uploadUrl) {
                    throw new Error("Could not get an upload URL.");
                }
                console.log(`Received upload URL: ${uploadUrl}`);

                console.log(`[2/3] Uploading ${file.name} to S3...`);

                const handleProgress = (progress: { loaded: number, total: number }) => {
                    const percentage = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
                    setUploadingFiles(prev =>
                        prev.map(f => (f.id === tempId ? { ...f, progress: percentage } : f))
                    );
                };

                await uploadFileToS3WithProgress(uploadUrl, file, handleProgress);

                // Chuyển sang trạng thái "Đang xác nhận"
                setUploadingFiles(prev => prev.map(f => f.id === tempId ? { ...f, progress: 100, status: 'confirming' } : f));

                console.log(`[3/3] Confirming upload for fileId: ${file_id}...`);
                await confirmUploadAPI(file_id, file.size);

                // Chuyển sang trạng thái "Thành công"
                setUploadingFiles(prev => prev.map(f => f.id === tempId ? { ...f, status: 'success' } : f));

                refetchAll();

                const end = Date.now();
                console.log(`Successfully uploaded ${file.name} in ${end - start}ms`);

            } catch (error: any) {
                console.error(`Failed to upload ${file.name}.`, error);
                setUploadingFiles(prev => prev.map(f => f.id === tempId ? { ...f, status: 'error', errorMessage: error.message } : f));
            }
        }

    };


    const handleFileUploadParallel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);

        if (files.length > 0) {
            setShowProgress(true);
        }

        // Create UploadingFile objects for all files at once
        const newUploadingFiles = await Promise.all(files.map(async file => {
            const uploadService = new UploadService();
            const fileId = await uploadService.initialize(file, parentFolder);

            return {
                id: fileId,
                name: file.name,
                progress: 0,
                status: 'uploading',
                type: file.name.split('.').pop()?.toLowerCase() ?? '',
                uploadService
            } as UploadingFile;
        }));

        // Add all files to uploadingFiles state at once
        setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

        // Create upload promises for all files
        const uploadPromises = newUploadingFiles.map(async (uploadingFile) => {
            try {
                console.log(`[1/2] Starting upload for ${uploadingFile.name}`);
                const start = Date.now();
                if (!uploadingFile.uploadService) {
                    throw new Error('Upload service is not initialized');
                }

                await uploadingFile.uploadService.uploadFile(
                    files.find(f => f.name === uploadingFile.name)!, // Get original File object
                    (progress: number) => {
                        // Update progress for this specific file
                        setUploadingFiles(prev =>
                            prev.map(f => f.id === uploadingFile.id ?
                                { ...f, progress } : f
                            )
                        );
                    },
                    () => {
                        // Mark this specific file as complete
                        setUploadingFiles(prev =>
                            prev.map(f => f.id === uploadingFile.id ?
                                { ...f, status: 'success' } : f
                            )
                        );
                    }
                );
                console.log(`[2/2] Upload to S3 completed for ${uploadingFile.name}`);

                const end = Date.now();
                console.log(`Successfully uploaded ${uploadingFile.name} in ${end - start}ms`);

            } catch (error) {
                console.error(`Failed to upload ${uploadingFile.name}:`, error);
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

                setUploadingFiles(prev =>
                    prev.map(f => f.id === uploadingFile.id ?
                        { ...f, status: 'error', errorMessage } : f
                    )
                );
            }
        });

        // Wait for all uploads to complete
        await Promise.all(uploadPromises)
            .finally(() => {
                refetchAll();
            });
    };

    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);

        const folderName = files[0]?.webkitRelativePath.split('/')[0] || 'Uploaded Folder';
        const totalFolderSize = files.reduce((acc, file) => acc + file.size, 0);
        const folderUploadId = `folder-${folderName}-${Date.now()}`;

        setShowProgress(true);
        const uploadService = new UploadService();
        setUploadingFiles(prev => [
            ...prev,
            { id: folderUploadId, name: folderName, progress: 0, status: 'uploading', type: 'folder', uploadService },
        ]);


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
            // BƯỚC 1: Gửi cấu trúc thư mục, lấy về danh sách file cần upload 
            console.log('[1/4] Preparing folder upload...');
            const prepareResponse = await prepareFolderUploadAPI(
                folder_structure,
                parentFolder || null
            );
            const { filesToUpload } = prepareResponse.data;
            console.log(`[2/4] Received ${filesToUpload.length} file URLs. Starting parallel upload...`);

            // Thiết lập theo dõi tiến trình tổng
            const progressMap = new Map<string, number>();
            let totalUploadedBytes = 0;

            // BƯỚC 2: Tạo các promise để upload file song song 
            const uploadPromises = filesToUpload.map((fileToUpload: any) => {
                // Lấy file object gốc từ Map
                const file = fileMap.get(fileToUpload.relativePath);
                if (!file) {
                    console.error(`Could not find file for path: ${fileToUpload.relativePath}`);
                    // Trả về một promise đã bị từ chối
                    return Promise.reject(`File not found: ${fileToUpload.relativePath}`);
                }

                const handleFileProgress = (progress: { loaded: number }) => {
                    const oldLoaded = progressMap.get(fileToUpload.fileId) || 0;
                    totalUploadedBytes += progress.loaded - oldLoaded;
                    progressMap.set(fileToUpload.fileId, progress.loaded);

                    const overallProgress = totalFolderSize > 0 ? (totalUploadedBytes / totalFolderSize) * 100 : 0;
                    setUploadingFiles(prev =>
                        prev.map(f => (f.id === folderUploadId ? { ...f, progress: overallProgress } : f))
                    );
                };

                // Gọi hàm upload lên S3 và trả về promise, kèm theo kết quả cần thiết
                return uploadFileToS3WithProgress(fileToUpload.uploadUrl, file, handleFileProgress)
                    .then(() => ({ fileId: fileToUpload.fileId, fileSize: file.size }));
            });

            // ---- BƯỚC 3: Thực thi tất cả các promise upload ----
            // Promise.all sẽ chạy tất cả song song và chỉ hoàn thành khi tất cả thành công
            const completedFiles = await Promise.all(uploadPromises);
            console.log(`[3/4] All ${completedFiles.length} files uploaded to S3 successfully.`);

            setUploadingFiles(prev => prev.map(f => f.id === folderUploadId ? { ...f, status: 'success' } : f));

            // ---- BƯỚC 4: Gửi xác nhận cuối cùng đến BE ----
            if (completedFiles.length > 0) {
                console.log('[4/4] Confirming upload with backend...');
                await completeFolderUploadAPI(completedFiles);
            }

            console.log('Folder upload process completed successfully!');

        } catch (error) {
            console.error('An error occurred during the folder upload process:', error);
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
                onChange={handleFileUploadParallel}
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
