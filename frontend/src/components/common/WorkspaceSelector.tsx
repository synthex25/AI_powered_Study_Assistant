import { useState, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiFolder, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import type { Workspace } from '../../types';

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading?: boolean;
  onSelect: (workspace: Workspace) => void;
  onCreate: (name: string) => Promise<Workspace | null>;
  onDelete: (id: string) => void;
}

/**
 * Dropdown selector for workspaces with create/delete functionality
 */
export const WorkspaceSelector: FC<WorkspaceSelectorProps> = ({
  workspaces,
  activeWorkspace,
  loading,
  onSelect,
  onCreate,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const workspace = await onCreate(newName.trim());
    if (workspace) {
      setNewName('');
      setIsCreating(false);
      setIsOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl transition-all text-blue-900"
      >
        <FiFolder className="text-blue-600" />
        <span className="text-blue-900 font-medium truncate max-w-[150px]">
          {activeWorkspace?.name || 'Select Workspace'}
        </span>
        <span className="text-blue-700 text-xs">
          {activeWorkspace ? `${activeWorkspace.sources?.length || 0} sources` : ''}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 w-80 bg-white border border-blue-200 rounded-xl shadow-sm z-50 overflow-hidden"
          >
            <div className="p-3 border-b border-[#e5e5e5] flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">Workspaces</span>
              <button
                onClick={() => setIsCreating(true)}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition"
              >
                <FiPlus size={16} />
              </button>
            </div>

            {isCreating && (
              <div className="p-3 border-b border-blue-200 bg-blue-50">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Workspace name..."
                    className="flex-1 bg-white border border-blue-300 rounded-lg px-3 py-2 text-sm text-blue-900 placeholder:text-blue-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                  <button
                    onClick={handleCreate}
                    className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                  >
                    <FiCheck size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewName('');
                    }}
                    className="p-2 rounded-lg hover:bg-blue-50 text-blue-700 transition"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-blue-700 text-sm">Loading...</div>
              ) : workspaces.length === 0 ? (
                <div className="p-4 text-center text-blue-700 text-sm">
                  No workspaces yet. Create one!
                </div>
              ) : (
                workspaces.map((ws) => (
                  <div
                    key={ws._id}
                    className={`flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 cursor-pointer group transition ${
                      activeWorkspace?._id === ws._id ? 'bg-blue-100 border-l-2 border-blue-600' : ''
                    }`}
                    onClick={() => {
                      onSelect(ws);
                      setIsOpen(false);
                    }}
                  >
                    <FiFolder className={`${activeWorkspace?._id === ws._id ? 'text-blue-600' : 'text-blue-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900 truncate">{ws.name}</p>
                      <p className="text-xs text-blue-700">
                        {ws.sources?.length || 0} sources · {formatDate(ws.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(ws._id);
                      }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-blue-50 text-blue-700 transition"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default WorkspaceSelector;
