import { motion } from 'framer-motion';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

const variants = {
  primary: {
    background: '#ffffff',
    color: '#1e3a8a',
    border: '2px solid #2563eb',
    boxShadow: '0 1px 2px rgba(37,99,235,0.08)',
  },
  secondary: {
    background: '#ffffff',
    color: '#1e3a8a',
    border: '2px solid #bfdbfe',
    boxShadow: '0 1px 2px rgba(37,99,235,0.04)',
  },
  ghost: {
    background: 'transparent',
    color: '#2563eb',
    border: '1px solid transparent',
    boxShadow: 'none',
  },
};

const sizes = {
  sm: { padding: '0.45rem 1rem', fontSize: '0.82rem', borderRadius: '999px' },
  md: { padding: '0.65rem 1.5rem', fontSize: '0.9rem', borderRadius: '999px' },
  lg: { padding: '0.85rem 2rem', fontSize: '1rem', borderRadius: '999px' },
};

const GradientButton = ({
  children,
  variant = 'primary',
  size = 'md',
  glow = true,
  style,
  ...props
}: GradientButtonProps) => (
  <motion.button
    whileHover={{ scale: 1.04, y: -1 }}
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
  style={{
      ...variants[variant],
      ...sizes[size],
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontWeight: 600,
      cursor: 'pointer',
      outline: 'none',
      transition: 'box-shadow 0.2s ease',
      ...style,
    }}
    {...(props as any)}
  >
    {children}
  </motion.button>
);

export default GradientButton;
