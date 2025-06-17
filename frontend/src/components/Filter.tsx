import { useState, useEffect } from 'react';
import { findUserByEmail } from '../apis/user.api';
import { User } from '../types/user.type';
import { useFolder } from '../context/folder.context';
import { X } from "lucide-react";

const documentCategories = ["not_classified", "business", "entertainment", "politics", "sport", "tech"];
const document_types = ["Thư mục", "pdf", "Hình ảnh", "docx"];

const EDIT_TIME_OPTIONS = [
    "Hôm nay",
    "7 ngày qua",
    "30 ngày qua",
    "Năm nay",
    "Năm ngoái",
    "Phạm vi tùy chỉnh"
];

const Filter = () => {
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedFileType, setSelectedFileType] = useState("");
    const [selectedEditTime, setSelectedEditTime] = useState("");

    const [userSearch, setUserSearch] = useState("");
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>("Người");
    const { refetchAll, searchQuery, setSearchQuery } = useFolder();


    const [open, setOpen] = useState(false);
    const [hoveredUser, setHoveredUser] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            const users = await findUserByEmail(userSearch);

            setFilteredUsers(users ? users : []);

        };
        fetchUsers();
    }, [userSearch]);

    const handleSelectUser = (userId: string, permission: string, userName: string) => {
        setOpen(false);
        setUserSearch("");
        if (permission === "Chủ sở hữu") {
            setSelectedUser(userName + " là " + permission);
        } else {
            setSelectedUser(permission + " " + userName);
        }
        setSearchQuery({
            ...searchQuery,
            user: userId,
            permission: permission
        });
        refetchAll();
    };

    const handleClearFilters = () => {
        setSearchQuery({});
        setSelectedCategory("");
        setSelectedFileType("");
        setSelectedEditTime("");
        setUserSearch("");
        setSelectedUser("Người");
        setOpen(false);
        refetchAll();
    };


    return (
        <div className="flex gap-4 items-center flex-wrap mb-4">
            {/* Loại */}
            <select value={selectedCategory}
                onChange={(e) => {
                    setSearchQuery({ ...searchQuery, document_category: e.target.value });
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
                    setSearchQuery({ ...searchQuery, document_type: e.target.value });
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
                    setSearchQuery({ ...searchQuery, date_after, date_before });
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
    )
}

export default Filter;