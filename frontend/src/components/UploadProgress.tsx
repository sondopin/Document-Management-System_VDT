// File: components/UploadProgress.tsx
import React, { useState } from 'react';
import '../css/UploadProgress.css'; // File CSS cho component
import { UploadingFile } from '../types/file.type';

interface UploadProgressProps {
    files: UploadingFile[];
    onClose: () => void;
}

// Icon component (bạn có thể dùng thư viện như react-icons)
const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

const SpinnerIcon = () => <div className="spinner"></div>;

const UploadProgress: React.FC<UploadProgressProps> = ({ files, onClose }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    
    if (files.length === 0) {
        return null;
    }

    const uploadingCount = files.filter(f => f.status === 'uploading').length;
    const title = uploadingCount > 0 ? `Đang tải ${uploadingCount} mục lên` : 'Tải lên hoàn tất';

    return (
        <div className="upload-progress-container">
            <div className="upload-header" onClick={() => setIsExpanded(!isExpanded)}>
                <span>{title}</span>
                <div className="header-icons">
                    <button className="icon-button">{isExpanded ? '▼' : '▲'}</button>
                    <button className="icon-button" onClick={(e) => { e.stopPropagation(); onClose(); }}>×</button>
                </div>
            </div>
            {isExpanded && (
                <div className="upload-file-list">
                    {files.map((file) => (
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
                                {file.status === 'uploading' && <SpinnerIcon />}
                                {file.status === 'success' && <CheckCircleIcon />}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default UploadProgress;