import { FC } from 'react';
import { motion } from 'framer-motion';

interface AIProcessingAnimationProps {
  isProcessing: boolean;
  message?: string;
  stage?:
    | 'started'
    | 'parsing_documents'
    | 'extracting_text'
    | 'generating_notes'
    | 'creating_flashcards'
    | 'creating_quizzes'
    | 'finalizing'
    | 'analyzing'
    | 'generating';
  progress?: number;
}

const AIProcessingAnimation: FC<AIProcessingAnimationProps> = ({
  isProcessing,
  message,
  stage = 'started',
  progress,
}) => {
  if (!isProcessing) return null;

  const stageInfo: Record<string, { text: string; defaultProgress: number }> = {
    started: { text: 'Initializing workspace analysis...', defaultProgress: 5 },
    parsing_documents: { text: 'Reading source documents...', defaultProgress: 18 },
    extracting_text: { text: 'Extracting key text blocks...', defaultProgress: 32 },
    generating_notes: { text: 'Generating AI notes...', defaultProgress: 55 },
    creating_flashcards: { text: 'Building flashcards...', defaultProgress: 74 },
    creating_quizzes: { text: 'Preparing quiz questions...', defaultProgress: 86 },
    finalizing: { text: 'Finalizing content package...', defaultProgress: 95 },
    analyzing: { text: 'Analyzing content structure...', defaultProgress: 35 },
    generating: { text: 'Generating study output...', defaultProgress: 60 },
  };

  const current = stageInfo[stage] || stageInfo.started;
  const displayProgress = progress ?? current.defaultProgress;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#eff6ff]/90 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-8 text-center border border-blue-200 shadow-sm">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-blue-100"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-4 border-transparent border-t-blue-600"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
          />
          <div className="absolute inset-0 grid place-items-center text-blue-700 font-bold">AI</div>
        </div>

        <h3 className="text-xl font-semibold text-blue-900 mb-2">{message || 'AI is processing your workspace'}</h3>
        <p className="text-sm text-blue-800 mb-5">{current.text}</p>

        <div className="w-full h-3 rounded-full bg-blue-50 overflow-hidden border border-blue-200">
          <motion.div
            className="h-full bg-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${displayProgress}%` }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />
        </div>
        <p className="mt-3 text-sm font-semibold text-blue-700">{displayProgress}% complete</p>
      </div>
    </motion.div>
  );
};

export default AIProcessingAnimation;
