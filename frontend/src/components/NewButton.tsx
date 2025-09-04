import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import FileActions from './FileActions';

const NewButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Đóng menu khi click ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block " ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-blue-500 text-white p-2 px-4 rounded-2xl mb-4 hover:bg-blue-600"
      >
        <Plus className="w-7 h-7" />
        Mới
      </button> 

      {isOpen && (
        <div className="absolute z-10 w-56 bg-white border rounded shadow-lg">
          <FileActions />
        </div>
      )}
    </div>
  );
};

export default NewButton;
