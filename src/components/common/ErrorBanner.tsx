import { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiX, FiRefreshCw, FiWifi, FiLock, FiServer } from 'react-icons/fi';

interface ErrorBannerProps {
  error: string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  type?: 'error' | 'warning' | 'info';
  className?: string;
}

/**
 * Professional error banner component for displaying API errors inline
 */
const ErrorBanner: FC<ErrorBannerProps> = ({ 
  error, 
  onDismiss, 
  onRetry, 
  type = 'error',
  className = '' 
}) => {
  if (!error) return null;

  // Determine icon based on error message
  const getIcon = () => {
    const lowerError = error.toLowerCase();
    if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('timeout')) {
      return <FiWifi className="w-5 h-5" />;
    }
    if (lowerError.includes('403') || lowerError.includes('unauthorized') || lowerError.includes('access denied') || lowerError.includes('api key')) {
      return <FiLock className="w-5 h-5" />;
    }
    if (lowerError.includes('500') || lowerError.includes('server')) {
      return <FiServer className="w-5 h-5" />;
    }
    return <FiAlertTriangle className="w-5 h-5" />;
  };

  // Color schemes
  const colorSchemes = {
    error: {
      bg: 'from-red-500/10 to-red-600/5',
      border: 'border-red-500/30',
      icon: 'bg-red-500/20 text-red-400',
      text: 'text-red-200',
      button: 'bg-red-500/20 hover:bg-red-500/30 text-red-300',
    },
    warning: {
      bg: 'from-yellow-500/10 to-orange-600/5',
      border: 'border-yellow-500/30',
      icon: 'bg-yellow-500/20 text-yellow-400',
      text: 'text-yellow-200',
      button: 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300',
    },
    info: {
      bg: 'from-blue-500/10 to-indigo-600/5',
      border: 'border-blue-500/30',
      icon: 'bg-blue-500/20 text-blue-400',
      text: 'text-blue-200',
      button: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300',
    },
  };

  const colors = colorSchemes[type];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className={`relative overflow-hidden rounded-xl border ${colors.border} ${className}`}
      >
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-r ${colors.bg}`} />
        
        {/* Content */}
        <div className="relative flex items-center gap-4 p-4">
          {/* Icon */}
          <div className={`flex-shrink-0 p-2.5 rounded-lg ${colors.icon}`}>
            {getIcon()}
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${colors.text}`}>
              {error}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${colors.button}`}
              >
                <FiRefreshCw className="w-4 h-4" />
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ErrorBanner;
