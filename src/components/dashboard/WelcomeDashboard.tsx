import { useState, type FC } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { FiType, FiEye, FiFolder, FiLoader } from 'react-icons/fi';
import Logo from '../common/Logo';
import { ErrorBanner } from '../common';

interface WelcomeDashboardProps {
  workspaces: any[];
  wsLoading: boolean;
  wsError?: string | null;
  createWorkspace: (name: string, description?: string) => Promise<any>;
  deleteWorkspace: (id: string) => Promise<any>;
  loadWorkspaces?: () => void;
  newWorkspaceName: string;
  setNewWorkspaceName: (name: string) => void;
  message: any;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
];

const WelcomeDashboard: FC<WelcomeDashboardProps> = ({
  workspaces,
  wsLoading,
  wsError,
  createWorkspace,
  deleteWorkspace,
  loadWorkspaces,
  newWorkspaceName,
  setNewWorkspaceName,
  message
}) => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const getLanguageLabel = (code: string) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === (code || 'en'));
    return lang ? `${lang.flag} ${lang.code.toUpperCase()}` : '🇺🇸 EN';
  };

  const handleCreateWorkspace = async () => {
    if (newWorkspaceName.trim()) {
      try {
        setIsCreating(true);
        setCreateError(null);
        const result = await createWorkspace(newWorkspaceName.trim());
        setNewWorkspaceName('');
        if (result?._id) {
          navigate(`/workspace/${result._id}`);
        }
      } catch (error: unknown) {
        console.error('Failed to create workspace:', error);
        const err = error as { message?: string };
        setCreateError(err.message || 'Failed to create workspace');
      } finally {
        setIsCreating(false);
      }
    };
  };
  return (
    <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-6 py-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <Logo size="lg" className="mb-2 justify-center" showText={false} />
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          Welcome to <span className="text-blue-600">Notewise</span>
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
          The ultimate AI-powered study companion. Transform any PDF, article, or notes into interactive study materials in seconds.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        {/* Create New Workspace Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col h-[480px] hover:shadow-md transition-shadow"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
            <FaPlus className="text-2xl text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Create New Workspace</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Start fresh by creating a new organized space for your study material.
          </p>
          
          <div className="mt-auto space-y-4">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              disabled={isCreating}
              placeholder="e.g., Final Exam Prep, Biology 101"
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-5 py-4 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) {
                  handleCreateWorkspace();
                }
              }}
            />
            <button 
              onClick={handleCreateWorkspace}
              disabled={!newWorkspaceName.trim() || isCreating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <FiLoader className="animate-spin" size={20} />
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <>
                  <FaPlus size={14} />
                  <span>Get Started</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Existing Workspaces List Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col h-[480px]"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiEye className="text-xl text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Recent Workspaces</h3>
            </div>
            <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600 border border-gray-200">
              {workspaces.length} total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 space-y-3">
            {wsLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : workspaces.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <FiType size={40} className="mb-4 text-gray-400" />
                <p className="text-gray-600">No workspaces found.<br/>Create your first one to start!</p>
              </div>
            ) : (
              workspaces.map((ws) => (
                <motion.div
                  key={ws._id}
                  whileHover={{ scale: 1.01, x: 4 }}
                  onClick={() => navigate(`/workspace/${ws._id}`)}
                  className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 cursor-pointer transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 text-gray-600 group-hover:text-blue-600">
                    <FiFolder className="text-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate text-base mb-1">{ws.name}</h4>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] font-bold uppercase tracking-wider border border-blue-200">
                          {getLanguageLabel(ws.language)}
                        </span>
                        <span className="text-xs text-gray-600 flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-blue-600"></div>
                          {ws.sources?.length || 0} sources
                        </span>
                        <span className="text-xs text-gray-600 flex items-center gap-1.5 border-l border-gray-300 pl-3">
                          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                          {new Date(ws.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWorkspace(ws._id);
                      }}
                      className="p-2 rounded-lg hover:bg-red-100 text-gray-500 hover:text-red-600 transition-all"
                      title="Delete Workspace"
                    >
                      <FaTrash size={14} />
                    </button>
                    <FiEye className="text-blue-600" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Info / Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12 flex flex-wrap justify-center gap-12 border-t border-gray-200 pt-8 w-full"
      >
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-900 mb-1">100%</p>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Privacy Focused</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-900 mb-1">GPT-4o</p>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Powered Engine</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-900 mb-1">24/7</p>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Study Buddy</p>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomeDashboard;
