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

const ErrorBanner: FC<ErrorBannerProps> = ({
  error,
  onDismiss,
  onRetry,
  type = 'error',
  className = '',
}) => {
  if (!error) return null;

  const getIcon = () => {
    const normalized = error.toLowerCase();
    if (normalized.includes('network') || normalized.includes('connection') || normalized.includes('timeout')) {
      return <FiWifi className="w-5 h-5" />;
    }
    if (normalized.includes('403') || normalized.includes('unauthorized') || normalized.includes('access denied')) {
      return <FiLock className="w-5 h-5" />;
    }
    if (normalized.includes('500') || normalized.includes('server')) {
      return <FiServer className="w-5 h-5" />;
    }
    return <FiAlertTriangle className="w-5 h-5" />;
  };

  const palette = {
    error: {
      wrapper: 'bg-red-50 border-red-200',
      icon: 'bg-red-100 text-red-700',
      text: 'text-red-900',
      action: 'bg-red-100 hover:bg-red-200 text-red-800',
    },
    warning: {
      wrapper: 'bg-blue-50 border-blue-200',
      icon: 'bg-blue-100 text-blue-700',
      text: 'text-blue-900',
      action: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
    },
    info: {
      wrapper: 'bg-blue-50 border-blue-200',
      icon: 'bg-blue-100 text-blue-700',
      text: 'text-blue-900',
      action: 'bg-blue-100 hover:bg-blue-200 text-blue-800',
    },
  }[type];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.99 }}
        transition={{ duration: 0.2 }}
        className={`rounded-xl border px-4 py-3 ${palette.wrapper} ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 ${palette.icon}`}>{getIcon()}</div>

          <div className="flex-1 min-w-0 pt-0.5">
            <p className={`text-sm font-medium ${palette.text}`}>{error}</p>
          </div>

          <div className="flex items-center gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${palette.action}`}
              >
                <FiRefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-50 hover:text-blue-900 transition-colors"
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
