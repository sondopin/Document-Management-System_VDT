// File: components/UploadProgress.tsx
import React, { useState } from 'react';
import '../css/UploadProgress.css'; // File CSS cho component
import { UploadingFile } from '../types/file.type';

interface UploadProgressProps {
    file: UploadingFile;
    onPause?: (fileId: string) => void;
    onResume?: (fileId: string) => void;
    onCancel?: (fileId: string) => void;
}


const UploadProgress: React.FC<UploadProgressProps> = ({ file, onPause, onResume, onCancel }) => {
    const [isPaused, setIsPaused] = useState(false);

    const CheckCircleIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    );

    return (
        <div key={file.id} className="upload-file-item">
            <img src={file.type === 'folder' ? '/folder.png' : file.type === 'pdf' ? '/pdf.jpg' : file.type === 'jpeg' || file.type === 'jpg' || file.type === 'png' ? '/image.png' : file.type === 'doc' || file.type === 'docx' ? '/docx.jpeg' : '/file.png'} alt={file.name} className="file-icon" />
            <div className="file-details">
                <div className="file-name">{file.name}</div>
                {file.status === 'uploading' && (
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar"
                            style={{ width: `${file.progress}%` }}
                        />
                    </div>
                )}
                {file.status === 'error' && <div className="status-text error">Tải lên thất bại</div>}
            </div>
            <div className="file-status-icon">
                {file.status === 'success' ? (
                    <CheckCircleIcon />
                ) : (
                    <>
                        {isPaused ? (
                            <button
                                className="icon-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsPaused(false);
                                    onResume?.(file.id);
                                }}
                            >
                                ▶
                            </button>
                        ) : (
                            <button
                                className="icon-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsPaused(true);
                                    onPause?.(file.id);
                                }}
                            >
                                ⏸
                            </button>
                        )}
                        <button
                            className="icon-button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onCancel?.(file.id);
                            }}
                        >
                            ⏹
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default UploadProgress;