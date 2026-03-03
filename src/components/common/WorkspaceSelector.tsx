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
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
      >
        <FiFolder className="text-indigo-400" />
        <span className="text-gray-200 font-medium truncate max-w-[150px]">
          {activeWorkspace?.name || 'Select Workspace'}
        </span>
        <span className="text-gray-500 text-xs">
          {activeWorkspace ? `${activeWorkspace.sources?.length || 0} sources` : ''}
        </span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Workspaces</span>
              <button
                onClick={() => setIsCreating(true)}
                className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-indigo-400 transition"
              >
                <FiPlus size={16} />
              </button>
            </div>

            {/* Create New */}
            {isCreating && (
              <div className="p-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Workspace name..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                  <button
                    onClick={handleCreate}
                    className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition"
                  >
                    <FiCheck size={14} />
                  </button>
                  <button
                    onClick={() => { setIsCreating(false); setNewName(''); }}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Workspace List */}
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
              ) : workspaces.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No workspaces yet. Create one!
                </div>
              ) : (
                workspaces.map((ws) => (
                  <div
                    key={ws._id}
                    className={`flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer group transition ${
                      activeWorkspace?._id === ws._id ? 'bg-indigo-500/10 border-l-2 border-indigo-500' : ''
                    }`}
                    onClick={() => { onSelect(ws); setIsOpen(false); }}
                  >
                    <FiFolder className={`${activeWorkspace?._id === ws._id ? 'text-indigo-400' : 'text-gray-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{ws.name}</p>
                      <p className="text-xs text-gray-500">
                        {ws.sources?.length || 0} sources · {formatDate(ws.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(ws._id);
                      }}
                      className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition"
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

      {/* Click outside to close */}
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
