// This is a simplified Google Drive clone layout with sidebar and main content
// Tailwind CSS and React are assumed to be set up in your project

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
import {AppContext} from '../context/app.context';
import { useContext } from 'react';
import MainContent from '../components/MainContent';


const SidebarItem = ({ label, icon: Icon, onClick, active }: any) => (
  <div
    onClick={onClick}
    className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer hover:bg-gray-100 ${active ? 'bg-blue-100 font-medium' : ''}`}
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </div>
);

const Home = () => {
  const [view, setView] = useState<'my_drive' | 'shared' | 'trash'>('my_drive');
  const { parentFolder, setParentFolder, breadcrumbs, setBreadcrumbs, option, setOption } = useFolder();
  const { isAuthenticated } = useContext(AppContext);

  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-64 p-4 border-r">
        <NewButton />

        <SidebarItem
          label="Drive của tôi"
          icon={FolderOpen}
          active={view === 'my_drive'}
          onClick={() => {
            setView('my_drive');
            setBreadcrumbs([{ name: 'Drive của tôi', id: null }]);
            setParentFolder(null);
            setOption('owner');
            navigate('/drive/my-drive');
            document.title = 'Drive của tôi - VDT Drive';
          }}
        />

        <SidebarItem
          label="Được chia sẻ với tôi"
          icon={Users}
          active={view === 'shared'}
          onClick={() => {
            setView('shared');
            setBreadcrumbs([{ name: 'Được chia sẻ với tôi', id: null }]);
            setParentFolder(null);
            setOption('shared');
            navigate('/drive/shared');
            document.title = 'Được chia sẻ với tôi - VDT Drive';
          }}
        />

        <SidebarItem
          label="Thùng rác"
          icon={Trash2}
          active={view === 'trash'}
          onClick={() => {
            setView('trash');
            setBreadcrumbs([{ name: 'Thùng rác', id: null }]);
            setParentFolder(null);
            setOption('trash');
            navigate('/drive/trash');
            document.title = 'Thùng rác - VDT Drive';
          }}
        />
      </div>

      {/* Main content */}
      {isAuthenticated ? (
        <MainContent />
      ) : (
        <div className="flex-1 p-4 overflow-y-auto">
          <p>Please log in to access your files.</p>
        </div>
      )}
    </div>
  );
};

export default Home;
