import { useState, useEffect, useRef, useCallback, type FC } from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiPause, FiRotateCcw, FiSettings } from 'react-icons/fi';

// ============================================================================
// Types
// ============================================================================

type TimerMode = 'work' | 'break' | 'longBreak';

interface TimerSettings {
  workDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SETTINGS: TimerSettings = {
  workDuration: 25 * 60,
  breakDuration: 5 * 60,
  longBreakDuration: 15 * 60,
  sessionsBeforeLongBreak: 4,
};

const MODE_COLORS: Record<TimerMode, string> = {
  work: 'from-indigo-500 to-purple-600',
  break: 'from-emerald-500 to-teal-600',
  longBreak: 'from-blue-500 to-cyan-600',
};

const MODE_LABELS: Record<TimerMode, string> = {
  work: 'Focus Time',
  break: 'Short Break',
  longBreak: 'Long Break',
};

// ============================================================================
// Component
// ============================================================================

const PomodoroTimer: FC = () => {
  const [settings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<TimerMode>('work');
  const [timeLeft, setTimeLeft] = useState(settings.workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Timer Logic
  // ─────────────────────────────────────────────────────────────────────────
  const getDuration = useCallback((timerMode: TimerMode): number => {
    switch (timerMode) {
      case 'work':
        return settings.workDuration;
      case 'break':
        return settings.breakDuration;
      case 'longBreak':
        return settings.longBreakDuration;
    }
  }, [settings]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQQ7lLGXjGIdAU+32e/WsDYXAFGpx+LVqzAPQGhcYn+hwc91Khnj/gAAAAA=');
      audio.volume = 0.5;
      audio.play();
    } catch (error) {
      console.log('Audio not available');
    }
  };

  const switchMode = useCallback(() => {
    playNotificationSound();
    
    if (mode === 'work') {
      const newSessions = completedSessions + 1;
      setCompletedSessions(newSessions);
      
      if (newSessions % settings.sessionsBeforeLongBreak === 0) {
        setMode('longBreak');
        setTimeLeft(settings.longBreakDuration);
      } else {
        setMode('break');
        setTimeLeft(settings.breakDuration);
      }
    } else {
      setMode('work');
      setTimeLeft(settings.workDuration);
    }
    
    setIsRunning(false);
  }, [mode, completedSessions, settings]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      switchMode();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, switchMode]);

  // ─────────────────────────────────────────────────────────────────────────
  // Controls
  // ─────────────────────────────────────────────────────────────────────────
  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getDuration(mode));
  };

  const skipMode = () => {
    switchMode();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Formatting
  // ─────────────────────────────────────────────────────────────────────────
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = 1 - timeLeft / getDuration(mode);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative z-[200]">
      <audio ref={audioRef} preload="auto" />
      
      {/* Compact Timer Display */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`bg-gradient-to-r ${MODE_COLORS[mode]} p-3 rounded-xl shadow-lg cursor-pointer`}
        onClick={() => setShowSettings(!showSettings)}
      >
        <div className="flex items-center gap-3">
          {/* Progress Ring */}
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="3"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress)}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
              {completedSessions}
            </span>
          </div>

          {/* Time Display */}
          <div className="flex-1">
            <p className="text-white font-bold text-lg leading-none">
              {formatTime(timeLeft)}
            </p>
            <p className="text-white/70 text-[10px] uppercase tracking-wider">
              {MODE_LABELS[mode]}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTimer();
              }}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition text-white"
            >
              {isRunning ? <FiPause size={14} /> : <FiPlay size={14} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetTimer();
              }}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition text-white"
            >
              <FiRotateCcw size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Expanded Settings Panel - Fixed to viewport */}
      {showSettings && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setShowSettings(false)} 
          />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-72 bg-gray-100 border border-gray-200 rounded-xl p-4 shadow-2xl z-[9999]"
          >
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FiSettings className="text-indigo-400" />
              Timer Settings
            </h4>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-white text-xs"
            >
              Close
            </button>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(['work', 'break', 'longBreak'] as TimerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setTimeLeft(getDuration(m));
                  setIsRunning(false);
                }}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                  mode === m
                    ? `bg-gradient-to-r ${MODE_COLORS[m]} text-white`
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Skip Button */}
          <button
            onClick={skipMode}
            className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition"
          >
            Skip to Next
          </button>

          {/* Sessions Counter */}
          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-gray-500">
              Completed Sessions: <span className="text-indigo-400 font-bold">{completedSessions}</span>
            </p>
          </div>
        </motion.div>
        </>
      )}
    </div>
  );
};

export default PomodoroTimer;
