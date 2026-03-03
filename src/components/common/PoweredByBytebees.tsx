import { type FC } from 'react';
import { motion } from 'framer-motion';
import bytebeesLogo from '../../assets/images/bytebees-logo.png';

interface PoweredByBytebeesProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const PoweredByBytebees: FC<PoweredByBytebeesProps> = ({ 
  className = '', 
  showText = true,
  size = 'md' 
}) => {
  const sizes = {
    sm: { img: 'w-10 h-10', text: 'text-[10px]', gap: 'gap-2', padding: 'px-3 py-1.5' },
    md: { img: 'w-12 h-12', text: 'text-xs', gap: 'gap-3', padding: 'px-4 py-2' },
    lg: { img: 'w-20 h-20', text: 'text-sm', gap: 'gap-4', padding: 'px-6 py-3' },
  };

  const currentSize = sizes[size];

  return (
    <motion.div 
      className={`flex items-center ${currentSize.gap} ${currentSize.padding} rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => window.open('https://www.instagram.com/bytebees/', '_blank')}
    >
      <div className="relative flex-shrink-0">
        <img 
          src={bytebeesLogo} 
          alt="Bytebees" 
          className={`${currentSize.img} object-contain transition-all group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]`}
        />
      </div>
      {showText && (
        <div className="flex flex-col justify-center border-l border-white/10 pl-3">
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider leading-none mb-1">Powered by</span>
          <span className={`${currentSize.text} font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent leading-none`}>
            Bytebees
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default PoweredByBytebees;
