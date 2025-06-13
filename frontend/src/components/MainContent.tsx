import { useState } from 'react';
import { File } from '../types/file.type'; // Define types for Folder/File as needed
import { Folder } from '../types/folder.type'; // Define types for Folder/File as needed
import { Plus, Trash2, FolderOpen, Users } from 'lucide-react';
import { getFiles } from '../apis/file.api';
import { getFolders } from '../apis/folder.api';
import { useQueryForm } from '../hooks/useQueryForm'; // Assuming this is a custom hook to get user data
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import NewButton from '../components/NewButton';
import { useFolder } from '../context/folder.context';
import { set } from 'react-hook-form';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AppContext } from '../context/app.context';
import { useContext } from 'react';
import { ChevronDown, X } from "lucide-react";
import { findUserByEmail } from '../apis/user.api';
import { User } from '../types/user.type';
import { searchQueryForm } from '../types/file.type';
import { Result } from 'antd';
import ResultCard from './ResultCard';



const documentCategories = ["not_classified", "classified", "Báo cáo", "Đề xuất", "Khác"];
const document_types = ["Thư mục", "pdf", "Hình ảnh", "docx"];

const EDIT_TIME_OPTIONS = [
    "Hôm nay",
    "7 ngày qua",
    "30 ngày qua",
    "Năm nay",
    "Năm ngoái",
    "Phạm vi tùy chỉnh"
];

const BreadCrumb = ({ path, onNavigate }: { path: { name: string, id: string | null }[], onNavigate: (index: number) => void }) => (
    <div className="text-sm text-gray-600 mb-2">
        {path.map((item, idx) => (
            <span key={item.id || idx}>
                <button onClick={() => onNavigate(idx)} className="text-blue-600 hover:underline">
                    {item.name}
                </button>
                {idx < path.length - 1 && ' / '}
            </span>
        ))}
    </div>
);

const MainContent = () => {
    const { folderId } = useParams();
    const { parentFolder, setParentFolder, breadcrumbs, setBreadcrumbs, option, setOption } = useFolder();
    const [searchQuery, setSearchQuery] = useState<searchQueryForm>({});


    const [sortField, setSortField] = useState("name");
    const [sortAsc, setSortAsc] = useState(true);
    const [userSearch, setUserSearch] = useState("");
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>("Người");

    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedFileType, setSelectedFileType] = useState("");
    const [selectedEditTime, setSelectedEditTime] = useState("");
    const [open, setOpen] = useState(false);
    const [hoveredUser, setHoveredUser] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            const users = await findUserByEmail(userSearch);

            setFilteredUsers(users ? users : []);

        };
        fetchUsers();
    }, [userSearch]);

    useEffect(() => {
        if (folderId) {
            setParentFolder(folderId);
        }
    }, [folderId]);

    useEffect(() => {
        const saved = localStorage.getItem('breadcrumbs');
        if (saved) setBreadcrumbs(JSON.parse(saved));
    }, []);

    const { data: folders_query } = useQuery({
        queryKey: ['folders', option, parentFolder, searchQuery],
        queryFn: () => getFolders({ option, parent_folder: parentFolder, searchQuery: searchQuery }),
        enabled: option === 'owner' ? parentFolder !== undefined : true,
    });

    const { data: files_query } = useQuery({
        queryKey: ['files', option, parentFolder, searchQuery],
        queryFn: () => getFiles({ option, parent_folder: parentFolder, searchQuery: searchQuery }),
        enabled: option === 'owner' ? parentFolder !== undefined : true,
    });

    console.log("Search Query:", searchQuery);

    const files = files_query?.map((file) => ({
        ...file
        , id: file._id,
        name: file.name,
        size: file.size,
        document_type: file.document_type,
    })) || [];
    const folders = folders_query?.map((folder: Folder) => ({
        ...folder,
        id: folder._id,
        name: folder.name,
    })) || [];

    const navigate = useNavigate();

    const handleOpenFolder = (folder: Folder) => {
        setBreadcrumbs([...breadcrumbs, { name: folder.name, id: folder._id }]);
        localStorage.setItem('breadcrumbs', JSON.stringify([...breadcrumbs, { name: folder.name, id: folder._id }]));
        setParentFolder(folder._id);
        navigate(`/drive/folders/${folder._id}`);
    };

    const handleNavigateBreadcrumb = (index: number) => {
        const selected = breadcrumbs[index];
        setBreadcrumbs(breadcrumbs.slice(0, index + 1));
        localStorage.setItem('breadcrumbs', JSON.stringify(breadcrumbs.slice(0, index + 1)));
        setParentFolder(selected.id);
        if (selected.id === null) {
            navigate('/drive/my-drive');
        } else {
            navigate(`/drive/folders/${selected.id}`);
        }
    };

    const handleClearFilters = () => {
        setSearchQuery({});
        setSelectedCategory("");
        setSelectedFileType("");
        setSelectedEditTime("");
        setUserSearch("");
        setSelectedUser("Người");
        setOpen(false);
    };

    const handleSelectUser = (userId: string, permission: string, userName: string) => {
        setOpen(false);
        setUserSearch("");
        if (permission === "Chủ sở hữu") {
            setSelectedUser(userName + " là " + permission);
        } else {
            setSelectedUser(permission + " " + userName);
        }
        setSearchQuery(prev => ({
            ...prev,
            user: userId,
            permission: permission
        }));
    };

    const renderContent = () => {
        // Fetch files/folders based on `view` and `parentFolder`
        // Placeholder for demo
        return (
            <div className="grid grid-cols-1 gap-2">
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] px-4 py-2 bg-gray-100 text-sm font-semibold text-gray-700 border-b">
                    <div className="truncate">Tên</div>
                    <div className="truncate">{option === 'owner' || option === 'trash' ? 'Chủ sở hữu' : 'Người chia sẻ'}</div>
                    <div className="truncate">{option === 'owner' || option === 'shared'? 'Sửa đổi lần cuối' : 'Ngày chyển vào'}</div>
                    <div className="truncate">{option === 'owner' || option === 'trash' ? 'Kích cỡ tệp' : ''}</div>
                    <div></div> {/* Cột rỗng cho nút menu */}
                </div>
                {folders.map(folder => (
                    <ResultCard fifo={folder} onDoubleClick={() => handleOpenFolder(folder)} key={folder.id}>
                    </ResultCard>
                ))}
                {files.map(file => (
                    <ResultCard fifo={file} />
                ))}
                
            </div>
        );
    };




    return (
        <div className="flex-1 p-4 overflow-y-auto">
            <BreadCrumb path={breadcrumbs} onNavigate={handleNavigateBreadcrumb} />
            <div className="p-4">
                {/* Bộ lọc */}
                <div className="flex gap-4 items-center flex-wrap mb-4">
                    {/* Loại */}
                    <select value={selectedCategory}
                        onChange={(e) => {
                            setSearchQuery(prev => ({ ...prev, document_category: e.target.value }));
                            setSelectedCategory(e.target.value);
                        }}
                        className='border rounded px-2 py-1 shadow-sm bg-white'
                    >
                        <option value="">Loại</option>
                        {documentCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Người */}
                    <div className="">
                        <button
                            value={selectedUser}
                            onClick={() => setOpen(!open)}
                            className="px-4 py-2 border rounded bg-white shadow-sm"
                        >
                            {selectedUser}
                        </button>

                        {open && (
                            <div className="absolute z-10 mt-2 w-80 bg-white border shadow-xl rounded p-2">
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 mb-2 border rounded"
                                    placeholder="Tìm người và nhóm"
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                />

                                <ul className="max-h-60 overflow-y-auto">
                                    {filteredUsers.map(user => (
                                        <li
                                            key={user._id}
                                            className="flex justify-between items-center px-3 py-2 hover:bg-gray-100 relative group"
                                            onMouseEnter={() => setHoveredUser(user._id)}
                                            onMouseLeave={() => setHoveredUser(null)}
                                        >
                                            <div>
                                                <div className="font-medium">{user.user_name}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>

                                            {hoveredUser === user._id && (
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex space-x-2">
                                                    <button
                                                        className="text-blue-600 text-sm hover:underline"
                                                        onClick={() => handleSelectUser(user._id, "Chủ sở hữu", user.user_name)}
                                                    >
                                                        Chủ sở hữu
                                                    </button>
                                                    <button
                                                        className="text-green-600 text-sm hover:underline"
                                                        onClick={() => handleSelectUser(user._id, "Được chia sẻ với", user.user_name)}
                                                    >
                                                        Được chia sẻ
                                                    </button>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}


                    </div>

                    {/* Định dạng */}
                    <select value={selectedFileType}
                        onChange={(e) => {
                            setSearchQuery(prev => ({ ...prev, document_type: e.target.value }));
                            setSelectedFileType(e.target.value);
                        }}
                        className='border rounded px-2 py-1 shadow-sm bg-white'
                    >
                        <option value="">Định dạng</option>
                        {document_types.map(type => (
                            <option key={type} value={type.toLowerCase()}>{type}</option>
                        ))}
                    </select>

                    {/* Lần sửa đổi gần nhất */}
                    <select value={selectedEditTime}
                        onChange={(e) => {
                            setSelectedEditTime(e.target.value);
                            const now = new Date();
                            const option = e.target.value;
                            let date_after: Date | null = null, date_before: Date | null = null;

                            switch (option) {
                                case "Hôm nay":
                                    date_after = new Date(now.setHours(0, 0, 0, 0));
                                    break;
                                case "7 ngày qua":
                                    date_after = new Date(now.setDate(now.getDate() - 7));
                                    break;
                                case "30 ngày qua":
                                    date_after = new Date(now.setDate(now.getDate() - 30));
                                    break;
                                case "Năm nay":
                                    date_after = new Date(`${new Date().getFullYear()}-01-01`);
                                    break;
                                case "Năm ngoái":
                                    date_after = new Date(`${new Date().getFullYear() - 1}-01-01`);
                                    date_before = new Date(`${new Date().getFullYear() - 1}-12-31`);
                                    break;
                                default:
                                    break;
                            }
                            setSearchQuery(prev => ({ ...prev, date_after, date_before }));
                        }}
                        className='border rounded px-2 py-1 shadow-sm bg-white'
                    >
                        <option value="">Lần sửa đổi gần nhất</option>
                        {EDIT_TIME_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>

                    {/* Xóa bộ lọc */}
                    {Object.keys(searchQuery).length > 0 && (
                        <button onClick={handleClearFilters} className="flex items-center gap-1">
                            <X size={16} /> Xóa bộ lọc
                        </button>
                    )}
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default MainContent;