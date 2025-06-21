import { Folder } from '../types/folder.type'; // Define types for Folder/File as needed
import { File } from '../types/file.type'; // Define types for Folder/File as needed
import { getFiles } from '../apis/file.api';
import { getFolders } from '../apis/folder.api'; // Assuming this is a custom hook to get user data
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useFolder } from '../context/folder.context';
import { useEffect, useState } from 'react';
import ResultCard from './ResultCard';
import Filter from './Filter';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import UploadProgress from './UploadProgress';


type SortType = {
    name?: "asc" | "desc";
    last_modified?: "asc" | "desc";
}


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
    const { parentFolder, setParentFolder, breadcrumbs, setBreadcrumbs, option, setRefetchAll, searchQuery, setShowProgress, uploadingFiles, setUploadingFiles } = useFolder();
    const [sort, setSort] = useState<SortType>({
        name: "asc",
        last_modified: "asc"
    });


    useEffect(() => {
        const saved = localStorage.getItem('breadcrumbs');
        if (saved) setBreadcrumbs(JSON.parse(saved));
    }, []);

    const { data: folders_query, refetch: refetchFolders } = useQuery({
        queryKey: ['folders', option, parentFolder, searchQuery],
        queryFn: () => getFolders({ option, parent_folder: parentFolder, searchQuery: searchQuery }),
    });

    const { data: files_query, refetch: refetchFiles } = useQuery({
        queryKey: ['files', option, parentFolder, searchQuery],
        queryFn: () => getFiles({ option, parent_folder: parentFolder, searchQuery: searchQuery }),
    });

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

    useEffect(() => {
        const refetchFunction = () => {
            refetchFiles();
            refetchFolders();
        };
        setRefetchAll(() => refetchFunction); // dùng callback tránh closure lỗi
    }, [refetchFiles, refetchFolders, setRefetchAll]);


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

    const handleCloseProgress = () => {
        // Chỉ giữ lại các file bị lỗi, xóa các file đã thành công
        setUploadingFiles(uploadingFiles.filter(f => f.status === 'error'));
        // Nếu không còn file nào lỗi thì đóng hẳn
        if (uploadingFiles.every(f => f.status !== 'error')) {
            setShowProgress(false);
        }
    }


    for (const key in sort) {
        const sortOrder = sort[key as keyof SortType];
        folders?.sort((a: Folder, b: Folder) => {
            const A = a[key as keyof Folder];
            const B = b[key as keyof Folder];
            if (typeof A === 'string' && typeof B === 'string') {
                return sortOrder === 'asc' ? A.localeCompare(B) : B.localeCompare(A);
            } else if (typeof A === 'number' && typeof B === 'number') {
                return sortOrder === 'asc' ? A - B : B - A;
            } else if (A instanceof Date && B instanceof Date) {
                return sortOrder === 'asc' ? A.getTime() - B.getTime() : B.getTime() - A.getTime();
            } else {
                console.warn("Unsupported data type for sorting:", A, B);
                return 0;
            }
        });
        files?.sort((a: File, b: File) => {
            const A = a[key as keyof File];
            const B = b[key as keyof File];
            if (typeof A === 'string' && typeof B === 'string') {
                return sortOrder === 'asc' ? A.localeCompare(B) : B.localeCompare(A);
            } else if (typeof A === 'number' && typeof B === 'number') {
                return sortOrder === 'asc' ? A - B : B - A;
            } else if (A instanceof Date && B instanceof Date) {
                return sortOrder === 'asc' ? A.getTime() - B.getTime() : B.getTime() - A.getTime();
            } else {
                console.warn("Unsupported data type for sorting:", A, B);
                return 0;
            }
        });
    }

    const handleSort = (type: keyof SortType) => {
        setSort({ [type]: sort[type] === "asc" ? "desc" : "asc" });
    };


    const renderContent = () => {
        // Fetch files/folders based on `view` and `parentFolder` and `searchQuery`
        return (
            <div className="grid grid-cols-1 gap-2">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-x-4 px-4 py-2 bg-gray-100 text-sm font-semibold text-gray-700 border-b">
                    <div className="flex flex-row truncate items-center gap-2">
                        Tên
                        <button
                            className="flex gap-2 px-6 py-3 text-xl font-bold text-gray-800 rounded-lg hover:bg-gray-300 transition-transform transform hover:-translate-y-1 min-w-[20px]"
                            onClick={() => handleSort("name")}
                        >
                            {sort.name === 'asc' ? <FaArrowUp className='w-4 h-4' /> : <FaArrowDown className='w-4 h-4' />}
                        </button>

                    </div>
                    <div className="truncate items-center mt-2">{option === 'owner' || option === 'trash' ? 'Chủ sở hữu' : 'Người chia sẻ'}</div>
                    <div className="flex flex-row truncate items-center gap-2">
                        {option === 'owner' || option === 'shared' ? 'Sửa đổi lần cuối' : 'Ngày chyển vào'}
                        <button
                            className="flex gap-2 px-6 py-3 text-xl font-bold text-gray-800 rounded-lg hover:bg-gray-300 transition-transform transform hover:-translate-y-1 min-w-[20px]"
                            onClick={() => handleSort("last_modified")}
                        >
                            {sort.last_modified === 'asc' ? <FaArrowUp className='w-4 h-4' /> : <FaArrowDown className='w-4 h-4' />}
                        </button>
                    </div>
                    <div className="truncate items-center mt-2">{option === 'owner' || option === 'trash' ? 'Kích cỡ tệp' : ''}</div>
                    <div className="truncate items-center mt-2">Loại tài liệu
                    </div>
                    <div></div> {/* Cột rỗng cho nút menu */}

                </div>

                {folders.map(folder => (
                    <ResultCard fifo={folder} onDoubleClick={() => handleOpenFolder(folder)} key={folder.id} handleOpenFolder={handleOpenFolder}>
                    </ResultCard>
                ))}
                {files.map(file => (
                    <ResultCard fifo={file} />
                ))}
                <UploadProgress files={uploadingFiles} onClose={handleCloseProgress} />

            </div>
        );
    };

    return (
        <div className="flex-1 p-4 overflow-y-auto">
            <BreadCrumb path={breadcrumbs} onNavigate={handleNavigateBreadcrumb} />
            <div className="p-4">
                {/* Bộ lọc */}
                <Filter />

                {renderContent()}
            </div>
        </div>
    );
};

export default MainContent;