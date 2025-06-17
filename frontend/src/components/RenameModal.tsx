import React from 'react';

interface RenameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRename: (newName: string) => void;
    newName: string; // Optional prop for initial name
    setNewName: (name: string) => void; // Optional prop for setting new name
}

const RenameModal: React.FC<RenameModalProps> = ({ isOpen, onClose, onRename, newName, setNewName }) => {
    if (!isOpen) return null;

    const handleSubmit = () => {
        if (newName.trim()) {
            onRename(newName.trim());
            onClose();

        };
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl min-w-[300px]">
                <h2 className="text-lg font-semibold mb-4">Đổi tên</h2>
                <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full border px-3 py-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RenameModal;
