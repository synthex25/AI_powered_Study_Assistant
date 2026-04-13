import { type FC } from 'react';
import { RiMindMap } from 'react-icons/ri';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', iconSize: 'text-base' },
    md: { icon: 'w-10 h-10', text: 'text-xl', iconSize: 'text-lg' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', iconSize: 'text-2xl' },
  };

  const currentSize = sizes[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`relative ${currentSize.icon} rounded-xl bg-[#2563eb] flex items-center justify-center shadow-sm`}
      >
        <RiMindMap className={`text-white ${currentSize.iconSize}`} />
      </div>
      {showText && (
        <span
          className={`${currentSize.text} font-bold tracking-tight`}
          style={{
            fontFamily: 'var(--font-display)',
            color: '#1e3a8a',
          }}
        >
          Notewise
        </span>
      )}
    </div>
  );
};

export default Logo;
