import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  gradient?: string;
  delay?: number;
  hover?: boolean;
}

const GlassCard = ({
  children,
  className = '',
  gradient = 'from-blue-100 via-blue-50 to-white',
  delay = 0,
  hover = true,
}: GlassCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    whileHover={hover ? { y: -6, scale: 1.01 } : undefined}
    className={`relative rounded-2xl overflow-hidden ${className}`}
    style={{
      background: '#ffffff',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
      border: '1px solid #bfdbfe',
      boxShadow: '0 1px 4px rgba(37,99,235,0.08)',
    }}
  >
    <div className="absolute inset-x-0 top-0 h-px bg-blue-100" />
    {hover && <div className="absolute inset-0 pointer-events-none bg-white" />}
    {children}
  </motion.div>
);

export default GlassCard;
