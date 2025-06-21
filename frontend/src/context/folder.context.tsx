import { createContext, useContext, useState } from 'react';
import { searchQueryForm } from '../types/file.type';
import { UploadingFile } from '../types/file.type';

interface FolderContextType {
    parentFolder: string | null;
    setParentFolder: (parent_folder: string | null) => void;
    breadcrumbs: Array<{ name: string; id: string | null }>;
    setBreadcrumbs: (breadcrumbs: Array<{ name: string; id: string | null }>) => void;
    option: string;
    setOption: (option: string) => void;
    refetchAll: () => void;
    setRefetchAll: (refetch: () => void) => void;
    searchQuery: searchQueryForm;
    setSearchQuery: (searchQuery: searchQueryForm) => void;
    showProgress: boolean; // Optional property to show progress
    setShowProgress: (show: boolean) => void; // Optional setter for showProgress
    uploadingFiles: UploadingFile[]; // Optional property to track uploading files
    setUploadingFiles: React.Dispatch<React.SetStateAction<UploadingFile[]>>; // Optional setter for uploadingFiles
}

const initialFolderContext: FolderContextType = {
    parentFolder: null,
    setParentFolder: () => null,
    breadcrumbs: [{ name: 'Drive của tôi', id: null }],
    setBreadcrumbs: () => null,
    option: 'owner',
    setOption: () => null,
    refetchAll: () => null,
    setRefetchAll: () => null,
    searchQuery: {},
    setSearchQuery: () => null,
    showProgress: false, // Default value for showProgress
    setShowProgress: () => null, // Default setter for showProgress
    uploadingFiles: [], // Default value for uploading files
    setUploadingFiles: () => null, // Default setter for uploading files
};

const FolderContext = createContext<FolderContextType>(initialFolderContext);

export const useFolder = () => useContext(FolderContext);

export const FolderProvider = ({ children }: { children: React.ReactNode }) => {
    const [parentFolder, setParentFolder] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<Array<{ name: string; id: string | null }>>([{ name: 'Drive của tôi', id: null }]);
    const [option, setOption] = useState<string>('owner');
    const [refetchAll, setRefetchAll] = useState<() => void>(() => {
        console.warn('refetchAll function is not set');
        return () => {};
    });
    const [searchQuery, setSearchQuery] = useState<searchQueryForm>({});
    const [showProgress, setShowProgress] = useState<boolean>(false); // State for showing progress
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]); // State for uploading files

    return (
        <FolderContext.Provider value={{ parentFolder, setParentFolder, breadcrumbs, setBreadcrumbs, option, setOption, refetchAll, setRefetchAll, searchQuery, setSearchQuery, showProgress, setShowProgress, uploadingFiles, setUploadingFiles }}>
            {children}
        </FolderContext.Provider>
    );
};
