// FolderContext.js
import { createContext, useContext, useState } from 'react';

interface FolderContextType {
    parentFolder: string | null;
    setParentFolder: (parent_folder: string | null) => void;
    breadcrumbs: Array<{ name: string; id: string | null }>;
    setBreadcrumbs: (breadcrumbs: Array<{ name: string; id: string | null }>) => void;
    option: string;
    setOption: (option: string) => void;
}

const initialFolderContext: FolderContextType = {
    parentFolder: null,
    setParentFolder: () => null,
    breadcrumbs: [{ name: 'Drive của tôi', id: null }],
    setBreadcrumbs: () => null,
    option: 'owner',
    setOption: () => null,
};

const FolderContext = createContext<FolderContextType>(initialFolderContext);

export const useFolder = () => useContext(FolderContext);

export const FolderProvider = ({ children }: { children: React.ReactNode }) => {
    const [parentFolder, setParentFolder] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<Array<{ name: string; id: string | null }>>([{ name: 'Drive của tôi', id: null }]);
    const [option, setOption] = useState<string>('owner');

    return (
        <FolderContext.Provider value={{ parentFolder, setParentFolder, breadcrumbs, setBreadcrumbs, option, setOption }}>
            {children}
        </FolderContext.Provider>
    );
};
