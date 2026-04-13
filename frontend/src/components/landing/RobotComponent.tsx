import { motion } from 'framer-motion';
import { FiMessageSquare, FiZap, FiBookOpen } from 'react-icons/fi';

// ── Shared mascot SVG — same character used at all sizes ─────────────────────
// Uses unique gradient IDs scoped with a prefix to avoid conflicts when
// rendered multiple times on the same page.
export const MascotSVG = ({ idPrefix = 'mascot' }: { idPrefix?: string }) => (
  <svg viewBox="0 0 280 320" fill="none" xmlns="http://www.w3.org/2000/svg"
    style={{ width: '100%', height: '100%' }}>
    <defs>
      <linearGradient id={`${idPrefix}Body`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#dbeafe" /><stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id={`${idPrefix}Head`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#eff6ff" /><stop offset="100%" stopColor="#60a5fa" />
      </linearGradient>
      <linearGradient id={`${idPrefix}Eye`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e0f2fe" /><stop offset="100%" stopColor="#38bdf8" />
      </linearGradient>
      <linearGradient id={`${idPrefix}Ear`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#bfdbfe" /><stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
      <linearGradient id={`${idPrefix}Screen`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#eff6ff" /><stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <radialGradient id={`${idPrefix}Blush`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#bfdbfe" stopOpacity="0.65" />
        <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${idPrefix}Shadow`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
      </radialGradient>
      <filter id={`${idPrefix}Drop`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#2563eb" floodOpacity="0.18" />
      </filter>
      <filter id={`${idPrefix}EyeGlow`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    {/* Ground shadow */}
    <ellipse cx="140" cy="312" rx="72" ry="10" fill={`url(#${idPrefix}Shadow)`} />

    {/* Antenna */}
    <rect x="136" y="10" width="8" height="28" rx="4" fill="#60a5fa" />
    <circle cx="140" cy="8" r="10" fill="#dbeafe" />
    <circle cx="140" cy="8" r="6"  fill="#2563eb" />
    <circle cx="140" cy="8" r="3"  fill="#bfdbfe" />

    {/* Ears */}
    <ellipse cx="52"  cy="118" rx="14" ry="20" fill={`url(#${idPrefix}Ear)`} />
    <ellipse cx="228" cy="118" rx="14" ry="20" fill={`url(#${idPrefix}Ear)`} />
    <ellipse cx="52"  cy="118" rx="8"  ry="12" fill="rgba(255,255,255,0.15)" />
    <ellipse cx="228" cy="118" rx="8"  ry="12" fill="rgba(255,255,255,0.15)" />

    {/* Head */}
    <rect x="52" y="36" width="176" height="136" rx="44"
      fill={`url(#${idPrefix}Head)`} filter={`url(#${idPrefix}Drop)`} />
    <rect x="68" y="44" width="144" height="44" rx="28" fill="rgba(255,255,255,0.12)" />

    {/* Left eye */}
    <ellipse cx="104" cy="100" rx="26" ry="30"
      fill={`url(#${idPrefix}Eye)`} filter={`url(#${idPrefix}EyeGlow)`} />
    <ellipse cx="104" cy="102" rx="18" ry="20" fill="#0ea5e9" />
    <ellipse cx="104" cy="103" rx="10" ry="11" fill="#0c4a6e" />
    <ellipse cx="104" cy="103" rx="5"  ry="5.5" fill="#082f49" />
    <circle cx="110" cy="95" r="5" fill="white" opacity="0.9" />
    <circle cx="98"  cy="108" r="2" fill="white" opacity="0.5" />

    {/* Right eye */}
    <ellipse cx="176" cy="100" rx="26" ry="30"
      fill={`url(#${idPrefix}Eye)`} filter={`url(#${idPrefix}EyeGlow)`} />
    <ellipse cx="176" cy="102" rx="18" ry="20" fill="#0ea5e9" />
    <ellipse cx="176" cy="103" rx="10" ry="11" fill="#0c4a6e" />
    <ellipse cx="176" cy="103" rx="5"  ry="5.5" fill="#082f49" />
    <circle cx="182" cy="95" r="5" fill="white" opacity="0.9" />
    <circle cx="170" cy="108" r="2" fill="white" opacity="0.5" />

    {/* Blush */}
    <ellipse cx="76"  cy="136" rx="18" ry="12" fill={`url(#${idPrefix}Blush)`} />
    <ellipse cx="204" cy="136" rx="18" ry="12" fill={`url(#${idPrefix}Blush)`} />

    {/* Smile */}
    <path d="M108 148 Q140 172 172 148" stroke="#2563eb" strokeWidth="5"
      strokeLinecap="round" fill="none" />
    <path d="M116 152 Q140 164 164 152" stroke="white" strokeWidth="2.5"
      strokeLinecap="round" fill="none" opacity="0.4" />

    {/* Neck */}
    <rect x="116" y="170" width="48" height="18" rx="9" fill="#2563eb" />
    <rect x="122" y="173" width="36" height="12" rx="6" fill="rgba(255,255,255,0.1)" />

    {/* Body */}
    <rect x="44" y="186" width="192" height="100" rx="36"
      fill={`url(#${idPrefix}Body)`} filter={`url(#${idPrefix}Drop)`} />
    <rect x="56" y="194" width="168" height="36" rx="24" fill="rgba(255,255,255,0.1)" />

    {/* Belly screen */}
    <rect x="80"  y="202" width="120" height="68" rx="18" fill={`url(#${idPrefix}Screen)`} />
    <rect x="86"  y="208" width="108" height="56" rx="14" fill="#0f0c29" opacity="0.8" />
    <rect x="96"  y="216" width="72" height="5"  rx="2.5" fill="#a78bfa" opacity="0.9" />
    <rect x="96"  y="226" width="54" height="4"  rx="2"   fill="#60a5fa" opacity="0.7" />
    <rect x="96"  y="235" width="64" height="4"  rx="2"   fill="#60a5fa" opacity="0.5" />
    <rect x="96"  y="244" width="40" height="4"  rx="2"   fill="#34d399" opacity="0.7" />
    <rect x="96"  y="253" width="8"  height="4"  rx="2"   fill="#a78bfa" opacity="0.8" />

    {/* Heart */}
    <path d="M140 198 C140 198 132 192 132 186 C132 182 136 180 140 184 C144 180 148 182 148 186 C148 192 140 198 140 198Z"
      fill="#fda4af" opacity="0.9" />

    {/* Arms */}
    <rect x="10"  y="192" width="36" height="20" rx="10" fill="#2563eb" />
    <rect x="8"   y="208" width="28" height="52" rx="14" fill={`url(#${idPrefix}Body)`} />
    <ellipse cx="22" cy="262" rx="14" ry="10" fill="#1d4ed8" />
    <rect x="234" y="192" width="36" height="20" rx="10" fill="#2563eb" />
    <rect x="244" y="208" width="28" height="52" rx="14" fill={`url(#${idPrefix}Body)`} />
    <ellipse cx="258" cy="262" rx="14" ry="10" fill="#1d4ed8" />

    {/* Legs + feet */}
    <rect x="96"  y="284" width="36" height="24" rx="12" fill="#2563eb" />
    <rect x="148" y="284" width="36" height="24" rx="12" fill="#2563eb" />
    <ellipse cx="114" cy="308" rx="22" ry="10" fill="#1d4ed8" />
    <ellipse cx="166" cy="308" rx="22" ry="10" fill="#1d4ed8" />
  </svg>
);

// ── Floating badges (hero only) ───────────────────────────────────────────────
const BADGES = [
  { Icon: FiMessageSquare, label: 'Chat',    color: '#1d4ed8', bg: 'rgba(37,99,235,0.12)', delay: 0,   top: '12%',    left: '-8%'   },
  { Icon: FiZap,           label: 'Instant', color: '#2563eb', bg: 'rgba(37,99,235,0.12)',  delay: 0.8, top: '18%',    right: '-8%'  },
  { Icon: FiBookOpen,      label: 'Learn',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  delay: 1.6, bottom: '20%', right: '-6%'  },
];

// ── Hero robot (large, with badges + chat bubble) ─────────────────────────────
const RobotComponent = () => (
  <div style={{ position: 'relative', width: 380, height: 420,
    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

    {/* Ambient glow */}
    <div style={{
      position: 'absolute', width: 320, height: 320, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(96,165,250,0.08) 50%, transparent 70%)',
      filter: 'blur(32px)',
      top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
      pointerEvents: 'none',
    }} />

    {/* Pulse ring */}
    <motion.div
      style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%',
      border: '1px solid rgba(37,99,235,0.12)' }}
      animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    />

    {/* Floating badges */}
    {BADGES.map(({ Icon, label, color, bg, delay, ...pos }) => (
      <motion.div key={label}
        style={{ position: 'absolute', ...pos,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 12px', borderRadius: 999,
        background: bg, border: `1px solid ${color}30`,
          backdropFilter: 'blur(10px)', boxShadow: `0 4px 16px ${color}20`,
          fontSize: '0.72rem', fontWeight: 700, color, whiteSpace: 'nowrap' }}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        <Icon size={13} />{label}
      </motion.div>
    ))}

    {/* Robot body — floating */}
    <motion.div
      style={{ position: 'relative', zIndex: 10, width: 280, height: 320 }}
      animate={{ y: [0, -14, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Ground glow */}
      <motion.div style={{
        position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
        width: 140, height: 24, borderRadius: '50%',
        background: 'rgba(37,99,235,0.3)', filter: 'blur(14px)',
      }}
        animate={{ scaleX: [1, 1.3, 1], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <MascotSVG idPrefix="hero" />
    </motion.div>

    {/* Chat bubble */}
    <motion.div style={{
      position: 'absolute', top: 32, right: 0,
      padding: '7px 14px', borderRadius: '16px 16px 16px 4px',
      background: 'rgba(37,99,235,0.10)', border: '1px solid rgba(37,99,235,0.20)',
      color: '#1e3a8a', fontSize: '0.78rem', fontWeight: 700,
      backdropFilter: 'blur(12px)', boxShadow: '0 4px 20px rgba(124,58,237,0.15)',
      whiteSpace: 'nowrap',
    }}
      animate={{ opacity: [0, 1, 1, 0], y: [10, 0, 0, -6] }}
      transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
    >
      How can I help? ✨
    </motion.div>
  </div>
);

export default RobotComponent;
