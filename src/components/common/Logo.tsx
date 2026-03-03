import { type FC } from 'react';
import { RiMindMap } from 'react-icons/ri';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: FC<LogoProps> = ({ className = '', size = 'md', showText = true }) => {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-xl', iconSize: 'text-lg' },
    md: { icon: 'w-10 h-10', text: 'text-2xl', iconSize: 'text-xl' },
    lg: { icon: 'w-14 h-14', text: 'text-3xl', iconSize: 'text-3xl' },
  };

  const currentSize = sizes[size];

  return (
    <div 
      className={`flex items-center gap-2 ${className}`}
    >
      <div className={`relative ${currentSize.icon} rounded-lg bg-blue-600 flex items-center justify-center`}>
        <RiMindMap className={`text-white ${currentSize.iconSize}`} />
      </div>
      {showText && (
        <span className={`${currentSize.text} font-bold text-blue-600`}>
          Notewise
        </span>
      )}
    </div>
  );
};

export default Logo;
