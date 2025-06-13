import { useState, useRef, useEffect } from 'react';
import { MoreVertical, FileText, Download, Pencil, Trash2, Share2, ExternalLink, Undo2 } from 'lucide-react';
// import { getPresignedUrl, downloadFile, renameFileOrFolder, deleteFileOrFolder, shareFileOrFolder } from '@/api/fileApi';
import { File } from '../types/file.type'; // Adjust the import path as necessary
import { Folder } from '../types/folder.type'; // Adjust the import path as necessary
import { findUserById } from '../apis/user.api';
import { fetchCurrentUser } from '../apis/user.api';
import { User } from '../types/user.type';

import { deleteFileAPI, downloadFile, deleteFilePermanently, recoveryFile, getPresignedUrl, updateFileAPI } from '../apis/file.api';
import { deleteFolderAPI, downloadFolder, deleteFolderPermanently, recoveryFolder, updateFolderAPI } from '../apis/folder.api';
import { useFolder } from '../context/folder.context';
import RenameModal from './RenameModal';

interface ResultCardProps {
  fifo: File | Folder;
  onDoubleClick?: (fifo: File | Folder) => void;
}

export default function ResultCard({ fifo, onDoubleClick }: ResultCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(fifo.name);
  const [showShare, setShowShare] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [user, setUser] = useState<User | undefined>();
  const [currentUser, setCurrentUser] = useState<User | undefined>();
  const {option, setOption} = useFolder();

  const menuRef = useRef<HTMLDivElement>(null);

  const isFile = (fifo: File | Folder): fifo is File => {
    return fifo.document_type !== 'thư mục';
  };

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await findUserById(fifo.owner_id);
      setUser(userData);
    };
    fetchUser();
  }, [fifo.owner_id]);



  useEffect(() => {
    const getCurrentUser = async () => {
      const currentUserData = await fetchCurrentUser();
      setCurrentUser(currentUserData);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShowShare(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let iconUrl = '';
  if (fifo.document_type === 'thư mục') {
    iconUrl = '/folder.jpeg'; // Icon for folders
  } else {
    switch (fifo.document_type) {
      case 'pdf':
        iconUrl = '/pdf.jpg';
        break;
      case 'jpeg':
      case 'jpg':
      case 'png':
        iconUrl = '/image.png';
        break;
      case 'doc':
      case 'docx':
        iconUrl = '/docx.png';
        break;
      default:
        iconUrl = ''; // Default icon for other file types
        break;
    }
  }

    const handleOpen = async () => {
      try {
        const response = await getPresignedUrl(fifo._id);
        const url = response.data.url;
        window.open(url, '_blank');
      } catch (error) {
        console.error('Open error:', error);
      }
    };

    const handleDownload = async () => {
      try {
        if(isFile(fifo)) {
          const response = await downloadFile(fifo._id);
          const url = window.URL.createObjectURL(new Blob([response.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', fifo.name);
          document.body.appendChild(link);
          link.click();
          link.remove();
        } else {
          const response = await downloadFolder(fifo._id);
          const blob = new Blob([response.data], { type: 'application/zip' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', fifo.name);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }
      } catch (error) {
        console.error('Download error:', error);
      }
    };

    const handleRename = async () => {
      try {
        if (isFile(fifo)) {
          await updateFileAPI(fifo._id, { name: newName }); 
        }
        else {
          await updateFolderAPI(fifo._id, { name: newName });
        }
        setRenaming(false);
      //   if (onRenameSuccess) onRenameSuccess(fifo._id, newName);
      } catch (error) {
        console.error('Rename error:', error);
      }
    };



  const handleDelete = async () => {
    try {
      if (isFile(fifo)) {
        await deleteFileAPI(fifo._id);
      } else {
        await deleteFolderAPI(fifo._id);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  //   const handleShare = async () => {
  //     try {
  //     //   await shareFileOrFolder(fifo._id, searchUser);
  //       setSearchUser('');
  //       setShowShare(false);
  //     } catch (error) {
  //       console.error('Share error:', error);
  //     }
  //   };

  const handleRecovery = async () => {
    try {
      if (isFile(fifo)) {
        await recoveryFile(fifo._id);
      } else {
        await recoveryFolder(fifo._id);
      }
    } catch (error) {
      console.error('Recovery error:', error);
    }
  };

  const handleDeletePermanently = async () => {
    try {   
      if (isFile(fifo)) {
        await deleteFilePermanently(fifo._id);
      } else {
        await deleteFolderPermanently(fifo._id);
      }
    } catch (error) {
      console.error('Delete permanently error:', error);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center ml-3 px-4 py-2 border-b hover:bg-gray-50 text-sm relative" onDoubleClick={() => onDoubleClick?.(fifo)}>

        {/* Tên file/folder + icon */}
        <div className="flex items-center gap-2 truncate">
          <img
            src={iconUrl}
            alt={fifo.document_type}
            className="w-5 h-5 object-cover"
          />
          <span className="font-medium text-black truncate">{fifo.name}</span>
        </div>

        {/* Chủ sở hữu */}
        <div className="text-gray-600 truncate">{user?._id === currentUser?._id ? "Tôi" : user?.user_name}</div>

        {/* Sửa đổi lần cuối */}
        <div className="text-gray-600 truncate">
          {option === 'owner' || option === 'shared' ? (fifo.last_modified ? new Date(fifo.last_modified).toLocaleDateString() : '-') : (fifo.deleted_at ? new Date(fifo.deleted_at).toLocaleDateString() : '-')}
        </div>

        {/* Kích cỡ tệp */}
        <div className="text-gray-600 truncate">
          {fifo.document_type === "thư mục"
            ? "-"
            : `${(((fifo as File).size ?? 0) / 1024 / 1024).toFixed(2)} MB`}
        </div>

        {/* Nút ba chấm + menu chức năng */}
        <div className="relative justify-self-end" ref={menuRef}>
          <MoreVertical className="w-4 h-4 cursor-pointer" onClick={() => setMenuOpen(!menuOpen)} />
          {menuOpen && (option === 'owner' || option === 'shared') && (
            <div className="absolute right-0 mt-2 w-60 bg-white shadow-md rounded z-10">
              <button className="flex items-center px-4 py-2 w-full hover:bg-gray-100"  onClick={handleOpen}>
                <ExternalLink className="w-4 h-4 mr-2" /> Mở
              </button>
              <button className="flex items-center px-4 py-2 w-full hover:bg-gray-100"  onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" /> Tải xuống
              </button>
              <button className="flex items-center px-4 py-2 w-full hover:bg-gray-100" onClick={() => setRenaming(true)}>
                <Pencil className="w-4 h-4 mr-2" /> Đổi tên
              </button>

              <RenameModal
                isOpen={renaming}
                onClose={() => setRenaming(false)}
                onRename={handleRename}
                newName={newName}
                setNewName={setNewName}
              />

              <button className="flex items-center px-4 py-2 w-full hover:bg-gray-100">
                <Share2 className="w-4 h-4 mr-2" /> Chia sẻ
              </button>
              <button className="flex items-center px-4 py-2 w-full text-red-500 hover:bg-gray-100" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" /> Chuyển vào thùng rác
              </button>

              {showShare && (
                <div className="px-4 py-2">
                  <input
                    type="text"
                    placeholder="Nhập tên người dùng"
                    className="w-full border px-2 py-1 text-sm rounded"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                  />
                  <button
                    className="mt-2 w-full bg-blue-500 text-white py-1 rounded text-sm hover:bg-blue-600"
                  >
                    Chia sẻ
                  </button>
                </div>
              )}
            </div>
          )}
          {menuOpen && option === 'trash' && (
            <div className="absolute right-0 mt-2 w-60 bg-white shadow-md rounded z-10">
              <button className="flex items-center px-4 py-2 w-full hover:bg-gray-100" onClick={handleRecovery}>
                <Undo2 className="w-4 h-4 mr-2" /> Khôi phục
              </button>
              <button className="flex items-center px-4 py-2 w-full text-red-500 hover:bg-gray-100" onClick={handleDeletePermanently}>
                <Trash2 className="w-4 h-4 mr-2" />  Xóa vĩnh viễn
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

  );

}
