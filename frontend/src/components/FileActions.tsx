import React, { useRef, useState } from "react";
import { uploadFilesAPI } from "../apis/file.api";
import { uploadFolderAPI, createFolderAPI } from "../apis/folder.api";
import { useFolder } from "../context/folder.context";
import { useNavigate } from "react-router-dom";

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

    const { parentFolder, setParentFolder } = useFolder();
    const navigate = useNavigate();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const formData = new FormData();
        Array.from(e.target.files).forEach((file) => {
            formData.append("files", file);
        });
        console.log("Selected folder:", parentFolder);
        formData.append("parent_folder", parentFolder || "");
        await uploadFilesAPI(formData);
        if (parentFolder) {
            // Nếu có parentFolder, điều hướng đến thư mục đó
            setParentFolder(parentFolder);
            navigate(`/drive/folders/${parentFolder}`);
        } else {
            // Nếu không có parentFolder, điều hướng đến trang chính
            navigate("/drive/my-drive");
        }
    };

    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const formData = new FormData();
        const folder_structure: any[] = [];
        const pathMap = new Map();

        const insertToTree = (pathParts: string[], fullPath: string) => {
            let currentLevel = folder_structure;
            let currentPath = "";

            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                currentPath = currentPath ? `${currentPath}/${part}` : part;

                const isFile = i === pathParts.length - 1 && !e.target.files![0].webkitRelativePath.endsWith("/");

                if (isFile && part.includes(".")) {
                    // Là file
                    currentLevel.push({
                        type: "file",
                        name: part,
                        path: fullPath,
                    });
                } else {
                    // Là folder
                    if (!pathMap.has(currentPath)) {
                        const folder = {
                            type: "folder",
                            name: part,
                            children: [],
                        };
                        currentLevel.push(folder);
                        pathMap.set(currentPath, folder.children);
                    }
                    currentLevel = pathMap.get(currentPath);
                }
            }
        };

        Array.from(e.target.files).forEach((file) => {
            formData.append("files", file);
            const pathParts = file.webkitRelativePath.split("/");
            insertToTree(pathParts, file.webkitRelativePath);
        });

        formData.append("folder_structure", JSON.stringify(folder_structure));
        formData.append("parent_folder", parentFolder || "");
        await uploadFolderAPI(formData);
    };


    const handleCreateFolder = async () => {
        await createFolderAPI({ name: folderName, parent_folder: parentFolder || null });
        setModalOpen(false);
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
