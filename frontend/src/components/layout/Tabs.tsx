import type { FC } from 'react';
import { motion } from 'framer-motion';

interface TabsProps {
  tabs: string[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Tabs: FC<TabsProps> = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '5px',
      background: '#ffffff',
      border: '1px solid #e5e5e5',
      borderRadius: 999,
      gap: 4,
      overflowX: 'auto',
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <motion.button
            key={tab}
            onClick={() => setActiveTab(tab)}
            whileHover={!isActive ? { scale: 1.03 } : {}}
            whileTap={{ scale: 0.97 }}
            style={{
              position: 'relative',
              padding: '0.5rem 1.35rem',
              fontSize: '0.83rem',
              fontWeight: 500,
              borderRadius: 999,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              background: isActive ? '#2563eb' : '#ffffff',
              color: isActive ? '#ffffff' : '#1d4ed8',
              border: '1px solid #bfdbfe',
              boxShadow: isActive ? '0 4px 14px rgba(37,99,235,0.18)' : 'none',
              transition: 'color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.color = '#1e3a8a';
                (e.currentTarget as HTMLElement).style.background = '#eff6ff';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.color = '#1d4ed8';
                (e.currentTarget as HTMLElement).style.background = '#ffffff';
              }
            }}
          >
            {isActive && (
              <motion.div
                layoutId="pill-active"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 999,
                  background: '#2563eb',
                  zIndex: 0,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>{tab}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default Tabs;
