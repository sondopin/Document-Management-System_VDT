import { createContext, useContext, useState } from 'react';
import { searchQueryForm } from '../types/file.type';

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

    return (
        <FolderContext.Provider value={{ parentFolder, setParentFolder, breadcrumbs, setBreadcrumbs, option, setOption, refetchAll, setRefetchAll, searchQuery, setSearchQuery }}>
            {children}
        </FolderContext.Provider>
    );
};
