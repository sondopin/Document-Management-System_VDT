import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Download, Pencil, Trash2, Share2, ExternalLink, Undo2 } from 'lucide-react';
import { File } from '../types/file.type';
import { Folder } from '../types/folder.type';
import { findUserById, findUserByEmail } from '../apis/user.api';
import { fetchCurrentUser } from '../apis/user.api';
import { User } from '../types/user.type';
import { deleteFileAPI, downloadFile, deleteFilePermanently, recoveryFile, getPresignedUrl, updateFileAPI, shareFileAPI, unShareFileAPI } from '../apis/file.api';
import { deleteFolderAPI, downloadFolder, deleteFolderPermanently, recoveryFolder, updateFolderAPI, shareFolderAPI, unShareFolderAPI } from '../apis/folder.api';
import { useFolder } from '../context/folder.context';
import RenameModal from './RenameModal';

interface ResultCardProps {
  fifo: File | Folder;
  onDoubleClick?: (fifo: File | Folder) => void;
  handleOpenFolder?: (folder: Folder) => void;
}


export default function ResultCard({ fifo, onDoubleClick, handleOpenFolder }: ResultCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(fifo.name);
  const [showShare, setShowShare] = useState(false);
  const [searchUserByEmail, setSearchUserByEmail] = useState('');
  const [user, setUser] = useState<User | undefined>();
  const [currentUser, setCurrentUser] = useState<User | undefined>();
  const { option, refetchAll } = useFolder();
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [sharedUser, setSharedUser] = useState<string | undefined>();
  const [showChangeCategory, setShowChangeCategory] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const isFile = (fifo: File | Folder): fifo is File => {
    return fifo.document_type !== 'folder';
  };

  useEffect(() => {
    const fetchUsers = async () => {
      const users = await findUserByEmail(searchUserByEmail);

      setFilteredUsers(users ? users : []);

    };
    fetchUsers();
  }, [searchUserByEmail]);

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
  if (fifo.document_type === 'folder') {
    iconUrl = '/folder.png'; // Icon for folders
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
        iconUrl = '/docx.jpeg';
        break;
      default:
        iconUrl = '/file.png'; // Default icon for other file types
        break;
    }
  }

  const handleOpen = async () => {
    try {
      if (isFile(fifo)) {
        const response = await getPresignedUrl(fifo._id);
        let url = response.data.url;
        window.open(url, '_blank');
      } else {
        handleOpenFolder?.(fifo);
      }
    } catch (error) {
      console.error('Open error:', error);
    }
  };

  const handleDownload = async () => {
    try {
      if (isFile(fifo)) {
        // Gọi API backend để lấy Pre-signed URL
        const response = await downloadFile(fifo._id);
        const { url } = response.data; // Lấy URL và tên file từ response

        // Tạo một thẻ 'a' và thiết lập href là Pre-signed URL
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank'; // Tùy chọn: mở trong tab mới để tránh điều hướng khỏi trang hiện tại

        document.body.appendChild(link);
        link.click();
        link.remove(); // Xóa thẻ 'a' sau khi đã click

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
      // Hiển thị thông báo lỗi cho người dùng
      alert('Không thể tải file. Vui lòng thử lại sau.');
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
      refetchAll();
      setRenaming(false);
      setMenuOpen(false);
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
      refetchAll();
      setMenuOpen(false);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleShare = async () => {
    try {
      if (!sharedUser) {
        return;
      }
      if (isFile(fifo)) {
        await shareFileAPI(fifo._id, sharedUser);
      } else {
        await shareFolderAPI(fifo._id, sharedUser);
      }
      setSearchUserByEmail('');
      setShowShare(false);
      setMenuOpen(false);
      console.log('Shared successfully with:', sharedUser);
      console.log('Shared file', fifo._id);
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleChangeDocCategory = async (newCategory: string) => {
    try {
      if (isFile(fifo)) {
        await updateFileAPI(fifo._id, { document_category: newCategory });
      }
      refetchAll();
    } catch (error) {
      console.error('Change document category error:', error);
    }
  }

  const handleRecovery = async () => {
    try {
      if (isFile(fifo)) {
        await recoveryFile(fifo._id);
      } else {
        await recoveryFolder(fifo._id);
      }
      refetchAll();
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
      refetchAll();
    } catch (error) {
      console.error('Delete permanently error:', error);
    }
  };

  const handleUnshare = async () => {
    try {
      if (isFile(fifo)) {
        await unShareFileAPI(fifo._id);
      } else {
        await unShareFolderAPI(fifo._id);
      }
      setMenuOpen(false);
      refetchAll();
    } catch (error) {
      console.error('Unshare error:', error);
    }
  };


  return (
    <div>
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-x-4 items-center ml-3 px-4 py-2 border-b hover:bg-gray-50 text-sm relative" onDoubleClick={() => onDoubleClick?.(fifo)}>

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
        <div className="text-gray-600 truncate px-4">
          {fifo.document_type === "folder"
            ? "-"
            : `${(((fifo as File).size ?? 0) / 1024 / 1024).toFixed(2)} MB`}
        </div>

        <div>
          <span className="font-medium text-black truncate px-4">{isFile(fifo) ? fifo.document_category : '-'}</span>
        </div>

        {/* Nút ba chấm + menu chức năng */}
        <div className="relative justify-self-end" ref={menuRef}>
          <MoreVertical className="w-4 h-4 cursor-pointer" onClick={() => { setMenuOpen(!menuOpen); setShowShare(false); }} />

          {/* MENU chính */}
          {menuOpen && (option === 'owner' || option === 'shared') && (
            <div className="absolute right-0 mt-2 w-60 bg-white shadow-md rounded z-10">
              <button className="flex items-center px-4 py-2 w-full hover:bg-gray-100" onClick={handleOpen}>
                <ExternalLink className="w-4 h-4 mr-2" /> Mở
              </button>
              <button className="flex items-center px-4 py-2 w-full hover:bg-gray-100" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" /> Tải xuống
              </button>
              <button
                className={`flex items-center px-4 py-2 w-full ${option === 'shared' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                onClick={() => setRenaming(true)} // Fixed to trigger rename modal
                disabled={option === 'shared'}
              >
                <Pencil className="w-4 h-4 mr-2" /> Đổi tên
              </button>

              <RenameModal
                isOpen={renaming}
                onClose={() => setRenaming(false)}
                onRename={handleRename}
                newName={newName}
                setNewName={setNewName}
              />

              <button className="flex items-center px-4 py-2 w-full hover:bg-gray-100" onClick={() => setShowShare(!showShare)}>
                <Share2 className="w-4 h-4 mr-2" /> Chia sẻ
              </button>
              <button className={`flex items-center px-4 py-2 w-full hover:bg-gray-100 ${fifo.document_type === 'folder' ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}`} onClick={() => setShowChangeCategory(!showChangeCategory)} disabled={fifo.document_type === 'folder'}>
                <MoreVertical className="w-4 h-4 mr-2" /> Thay đổi loại tài liệu
              </button>
              <button
                className={`flex items-center px-4 py-2 w-full text-red-500`}
                onClick={option === 'owner' ? handleDelete : handleUnshare}
              >
                <Trash2 className="w-4 h-4 mr-2" /> {option === 'owner' ? 'Chuyển vào thùng rác' : 'Xóa'}
              </button>
            </div>
          )}

          {/* FORM SHARE - chỉ hiện khi showShare */}
          {menuOpen && showShare && (
            <div className="absolute right-[240px] mt-2 w-60 bg-white shadow-md rounded z-10 px-4 py-2">
              <input
                type="text"
                placeholder="Nhập tên người dùng"
                className="w-full border px-2 py-1 text-sm rounded"
                value={searchUserByEmail}
                onChange={(e) => setSearchUserByEmail(e.target.value)}
              />
              {filteredUsers.length > 0 && (
                <ul className="max-h-40 overflow-y-auto mt-2">
                  {filteredUsers.map((user) => (
                    <li
                      key={user._id}
                      className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setSharedUser(user._id);
                        setSearchUserByEmail(user.email);
                      }}
                    >
                      {user.email}
                    </li>
                  ))}
                </ul>
              )}
              <button
                className="mt-2 w-full bg-blue-500 text-white py-1 rounded text-sm hover:bg-blue-600"
                onClick={handleShare}
              >
                Chia sẻ
              </button>
            </div>
          )}
          {menuOpen && showChangeCategory && (
            <div className="absolute right-[240px] mt-2 w-60 bg-white shadow-md rounded z-10 px-4 py-2">
              <h3 className="font-semibold mb-2">Thay đổi loại tài liệu</h3>
              <select
                className="w-full px-4 py-2 hover:bg-gray-100"
                onChange={(e) => handleChangeDocCategory(e.target.value)}
                value={isFile(fifo) ? fifo.document_category : ''}
              >
                <option value="">Chọn loại tài liệu</option>
                <option value="business">business</option>
                <option value="entertainment">entertainment</option>
                <option value="politics">politics</option>
                <option value="sport">sport</option>
                <option value="tech">tech</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          )}

              {/* TRASH menu */}
              {menuOpen && option === 'trash' && (
                <div className="absolute right-0 mt-2 w-60 bg-white shadow-md rounded z-10">
                  <button className="flex items-center px-4 py-2 w-full hover:bg-gray-100" onClick={handleRecovery}>
                    <Undo2 className="w-4 h-4 mr-2" /> Khôi phục
                  </button>
                  <button className="flex items-center px-4 py-2 w-full text-red-500 hover:bg-gray-100" onClick={handleDeletePermanently}>
                    <Trash2 className="w-4 h-4 mr-2" /> Xóa vĩnh viễn
                  </button>
                </div>
              )}
            </div>
      </div>
      </div>

      );

}
