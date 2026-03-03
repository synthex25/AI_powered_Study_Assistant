import { FC } from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// Types
// ============================================================================

interface AIProcessingAnimationProps {
  /** Whether the animation is active */
  isProcessing: boolean;
  /** Optional message to display */
  message?: string;
  /** Stage of processing */
  stage?: 'started' | 'parsing_documents' | 'extracting_text' | 'generating_notes' | 
          'creating_flashcards' | 'creating_quizzes' | 'finalizing' | 'analyzing' | 'generating';
  /** Progress percentage (0-100) */
  progress?: number;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Professional AI processing animation with neural network visual.
 */
const AIProcessingAnimation: FC<AIProcessingAnimationProps> = ({
  isProcessing,
  message,
  stage = 'started',
  progress
}) => {
  if (!isProcessing) return null;

  // Map stages to display info
  const stageInfo: Record<string, { text: string; defaultProgress: number }> = {
    started: { text: "Initializing...", defaultProgress: 5 },
    parsing_documents: { text: "Reading your documents...", defaultProgress: 15 },
    extracting_text: { text: "Extracting content...", defaultProgress: 25 },
    generating_notes: { text: "Writing research notes...", defaultProgress: 50 },
    creating_flashcards: { text: "Creating flashcards...", defaultProgress: 75 },
    creating_quizzes: { text: "Generating quizzes...", defaultProgress: 85 },
    creating_recommendations: { text: "Adding recommendations...", defaultProgress: 90 },
    finalizing: { text: "Finalizing your content...", defaultProgress: 95 },
    completed: { text: "Done!", defaultProgress: 100 },
    // Legacy stages for compatibility
    analyzing: { text: "Analyzing content structure...", defaultProgress: 30 },
    generating: { text: "Generating research notes...", defaultProgress: 60 },
  };

  const currentStage = stageInfo[stage] || stageInfo.started;
  const displayProgress = progress ?? currentStage.defaultProgress;
  const displayMessage = message || "AI is processing your content...";
  const displayStageText = currentStage.text;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white/90 backdrop-blur-xl z-50 flex items-center justify-center"
    >
      <div className="text-center max-w-lg px-8">
        {/* Neural Network Animation */}
        <div className="relative w-48 h-48 mx-auto mb-8">
          {/* Outer ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-indigo-500/30"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Middle ring */}
          <motion.div
            className="absolute inset-4 rounded-full border-2 border-purple-500/40"
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          />
          
          {/* Inner ring */}
          <motion.div
            className="absolute inset-8 rounded-full border-2 border-cyan-400/50"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          />
          
          {/* Core */}
          <motion.div
            className="absolute inset-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
            animate={{ 
              scale: [1, 1.1, 1],
              boxShadow: [
                "0 0 20px rgba(99, 102, 241, 0.5)",
                "0 0 60px rgba(147, 51, 234, 0.7)",
                "0 0 20px rgba(99, 102, 241, 0.5)"
              ]
            }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* AI Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.svg
                className="w-12 h-12 text-white"
                fill="none"
                viewBox="0 0 24 24"
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.5"
                  d="M12 4v1m6.364.636l-.707.707M20 12h-1M17.657 17.657l-.707-.707M12 20v-1m-4.95-.05l-.707.707M4 12H3m3.343-5.657l-.707-.707"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
              </motion.svg>
            </div>
          </motion.div>
          
          {/* Floating particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-indigo-400 rounded-full"
              style={{
                left: '50%',
                top: '50%',
              }}
              animate={{
                x: [0, Math.cos(i * 45 * Math.PI / 180) * 80, 0],
                y: [0, Math.sin(i * 45 * Math.PI / 180) * 80, 0],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        {/* Status Text */}
        <motion.h2
          className="text-2xl font-bold text-white mb-2"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {displayMessage}
        </motion.h2>
        
        <p className="text-gray-400 mb-4">{displayStageText}</p>
        
        {/* Progress percentage */}
        <div className="text-indigo-400 text-xl font-mono mb-4">{displayProgress}%</div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${displayProgress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>

        {/* Stage indicators */}
        <div className="flex justify-between mt-4 text-xs text-gray-500">
          <span className={displayProgress <= 30 ? 'text-indigo-400' : 'text-gray-600'}>📄 Parse</span>
          <span className={displayProgress > 30 && displayProgress <= 70 ? 'text-purple-400' : 'text-gray-600'}>✨ Generate</span>
          <span className={displayProgress > 70 && displayProgress <= 90 ? 'text-pink-400' : 'text-gray-600'}>🎴 Create</span>
          <span className={displayProgress > 90 ? 'text-green-400' : 'text-gray-600'}>✓ Done</span>
        </div>
      </div>
    </motion.div>
  );
};

export default AIProcessingAnimation;
