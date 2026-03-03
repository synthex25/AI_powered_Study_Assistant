import { useState, type FC } from 'react';
import { FiEdit2 } from 'react-icons/fi';
import { FaPlus, FaSignOutAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

import Logo from '../common/Logo';
import { ProfilePopup } from '../profile';
import { useAppDispatch } from '../../hooks';
import { clearUser } from '../../store/reducers/userReducer';

// ============================================================================
// Types
// ============================================================================

interface HeaderProps {
  /** Callback fired when upload button is clicked */
  handleFileUpload: () => void;
  /** Current document title */
  title: string;
  /** Callback to update document title */
  setAiTitle: (title: string) => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Application header with navigation, upload button, and user actions
 */
const Header: FC<HeaderProps> = ({ handleFileUpload, title }) => {
  const dispatch = useAppDispatch();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  /**
   * Handle user logout
   */
  const handleLogout = (): void => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.clear();

    sessionStorage.clear();
    dispatch(clearUser());
    window.location.href = '/login';
  };

  return (
    <header className="flex justify-between items-center w-full px-6 py-4 bg-white/50 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40">
      {/* Left Section - Logo and Breadcrumb */}
      <div className="flex items-center gap-6">
        <Logo size="md" />
        <div className="h-8 w-px bg-white/10" />
        <nav className="flex items-center text-sm md:text-base">
          <a href="#" className="text-gray-400 hover:text-white transition-colors">
            Dashboard
          </a>
          <span className="mx-3 text-gray-600">/</span>
          <span className="font-medium text-white flex items-center gap-2">
            {title}
            <button className="p-1 hover:bg-white/10 rounded-full transition-colors group">
              <FiEdit2 className="text-gray-400 group-hover:text-indigo-400 text-xs" />
            </button>
          </span>
        </nav>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-4">
        <motion.button
          onClick={handleFileUpload}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all text-sm"
        >
          <FaPlus className="text-xs" />
          <span>Upload PDF</span>
        </motion.button>

        <div className="h-8 w-px bg-white/10 mx-2" />

        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setIsProfileOpen(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] cursor-pointer"
          >
            <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-800 font-bold text-sm hover:bg-transparent transition-colors">
              JD
            </div>
          </motion.button>

          <motion.button
            onClick={handleLogout}
            whileHover={{ scale: 1.1, color: '#ef4444' }}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Logout"
          >
            <FaSignOutAlt className="text-lg" />
          </motion.button>
        </div>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <ProfilePopup onClose={() => setIsProfileOpen(false)} />
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
