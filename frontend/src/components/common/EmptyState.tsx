import type { FC, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

const EmptyState: FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className="empty-state" style={{ gap: '0.25rem' }}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="empty-icon"
      >
        <div className="text-3xl">{icon}</div>
      </motion.div>

      <motion.h3
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.06, duration: 0.3 }}
        style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '0.5rem', textAlign: 'center' }}
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.3 }}
        style={{
          color: '#1d4ed8',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          maxWidth: '28rem',
          textAlign: 'center',
          marginBottom: '1.5rem',
        }}
      >
        {description}
      </motion.p>

      {action && (
        <motion.div
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.18, duration: 0.3 }}
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          {action}
        </motion.div>
      )}
    </div>
  );
};

export default EmptyState;
