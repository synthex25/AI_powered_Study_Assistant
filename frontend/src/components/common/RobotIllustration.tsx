import { type FC } from 'react';

const RobotIllustration: FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`robot-wrapper ${className}`}>
    {/* Glow shadow */}
    <div className="robot-glow" />

    <svg
      viewBox="0 0 200 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="robot-svg"
      aria-label="AI Robot Assistant"
    >
      <defs>
      <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="headGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eff6ff" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
        <linearGradient id="screenGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eff6ff" />
          <stop offset="100%" stopColor="#bfdbfe" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Antenna */}
      <line x1="100" y1="18" x2="100" y2="38" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="13" r="6" fill="#60a5fa" filter="url(#glow)" className="robot-antenna-dot" />

      {/* Head */}
      <rect x="58" y="38" width="84" height="64" rx="20" fill="url(#headGrad)" />

      {/* Eyes */}
      <circle cx="82" cy="65" r="10" fill="white" />
      <circle cx="118" cy="65" r="10" fill="white" />
      <circle cx="84" cy="65" r="5" fill="#2563eb" className="robot-eye" />
      <circle cx="120" cy="65" r="5" fill="#2563eb" className="robot-eye" />
      <circle cx="85" cy="63" r="2" fill="white" />
      <circle cx="121" cy="63" r="2" fill="white" />

      {/* Mouth */}
      <rect x="82" y="88" width="36" height="6" rx="3" fill="white" opacity="0.7" />
      <rect x="88" y="88" width="8" height="6" rx="3" fill="#60a5fa" />
      <rect x="104" y="88" width="8" height="6" rx="3" fill="#60a5fa" />

      {/* Neck */}
      <rect x="90" y="102" width="20" height="12" rx="4" fill="#2563eb" />

      {/* Body */}
      <rect x="44" y="114" width="112" height="80" rx="22" fill="url(#bodyGrad)" />

      {/* Chest screen */}
      <rect x="68" y="126" width="64" height="44" rx="10" fill="url(#screenGrad)" />
      {/* Screen lines */}
      <rect x="76" y="134" width="48" height="4" rx="2" fill="#1d4ed8" opacity="0.8" className="screen-line-1" />
      <rect x="76" y="142" width="36" height="4" rx="2" fill="#1d4ed8" opacity="0.6" className="screen-line-2" />
      <rect x="76" y="150" width="42" height="4" rx="2" fill="#1d4ed8" opacity="0.5" className="screen-line-3" />
      <circle cx="108" cy="162" r="4" fill="#34d399" filter="url(#glow)" className="robot-status-dot" />

      {/* Left arm */}
      <rect x="18" y="118" width="26" height="56" rx="13" fill="#2563eb" />
      <circle cx="31" cy="178" r="10" fill="#60a5fa" />

      {/* Right arm */}
      <rect x="156" y="118" width="26" height="56" rx="13" fill="#2563eb" />
      <circle cx="169" cy="178" r="10" fill="#60a5fa" />

      {/* Legs */}
      <rect x="68" y="194" width="26" height="36" rx="13" fill="#2563eb" />
      <rect x="106" y="194" width="26" height="36" rx="13" fill="#2563eb" />
      {/* Feet */}
      <rect x="60" y="222" width="40" height="14" rx="7" fill="#1d4ed8" />
      <rect x="100" y="222" width="40" height="14" rx="7" fill="#1d4ed8" />

      {/* Ear bolts */}
      <circle cx="58" cy="70" r="5" fill="#bfdbfe" />
      <circle cx="142" cy="70" r="5" fill="#bfdbfe" />
    </svg>

    {/* Floating orbit icons */}
    <div className="orbit-icon orbit-chat">💬</div>
    <div className="orbit-icon orbit-star">⚙️</div>
    <div className="orbit-icon orbit-bell">🔔</div>
    <div className="orbit-icon orbit-bolt">✨</div>
  </div>
);

export default RobotIllustration;
