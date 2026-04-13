import { useState, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUpload, FiZap, FiBookOpen, FiMessageSquare, FiCheck, 
  FiArrowRight, FiArrowLeft, FiX, FiFolder 
} from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  features?: string[];
  animation?: 'upload' | 'generate' | 'study' | 'chat';
}

const ONBOARDING_STEPS: Step[] = [
  {
    id: 1,
    title: 'Welcome to Notewise!',
    description: 'Your AI-powered study companion that transforms any content into interactive study materials. Let\'s get you started in just a few steps.',
    icon: <HiSparkles className="w-12 h-12" />,
    features: [
      'Upload PDFs, add URLs, or paste text',
      'AI generates comprehensive study notes',
      'Interactive flashcards & quizzes',
      'Smart AI chat for deeper understanding'
    ],
    animation: 'upload'
  },
  {
    id: 2,
    title: 'Create Your Workspace',
    description: 'Workspaces help you organize your study materials by subject, course, or project. Each workspace contains your sources and AI-generated content.',
    icon: <FiFolder className="w-12 h-12" />,
    features: [
      'Name your workspace (e.g., "Biology 101")',
      'Add multiple sources to one workspace',
      'All generated content stays organized',
      'Switch between workspaces easily'
    ],
    animation: 'upload'
  },
  {
    id: 3,
    title: 'Add Your Content',
    description: 'Upload your study materials in multiple formats. Our AI works with PDFs, web articles, and plain text.',
    icon: <FiUpload className="w-12 h-12" />,
    features: [
      'Upload PDF documents',
      'Add web URLs for articles & pages',
      'Paste text directly',
      'Combine multiple sources together'
    ],
    animation: 'upload'
  },
  {
    id: 4,
    title: 'Generate AI Content',
    description: 'Click the "Generate" button and let our AI analyze your content. It creates comprehensive study materials automatically.',
    icon: <FiZap className="w-12 h-12" />,
    features: [
      'Detailed research notes with diagrams',
      'Key concept flashcards',
      'Practice quizzes with explanations',
      'Related resource recommendations'
    ],
    animation: 'generate'
  },
  {
    id: 5,
    title: 'Study & Review',
    description: 'Use the generated materials to study effectively. Switch between tabs to access notes, flashcards, and quizzes.',
    icon: <FiBookOpen className="w-12 h-12" />,
    features: [
      'AI Notes - Comprehensive summaries',
      'AI Flashcards - Quick memorization',
      'AI Quizzes - Test your knowledge',
      'AI Recommendations - Further reading'
    ],
    animation: 'study'
  },
  {
    id: 6,
    title: 'Ask the AI',
    description: 'Have questions? Use the AI chat to ask anything about your content. Get instant, contextual answers.',
    icon: <FiMessageSquare className="w-12 h-12" />,
    features: [
      'Ask questions about your content',
      'Get explanations and examples',
      'Clarify complex concepts',
      'Available in multiple languages'
    ],
    animation: 'chat'
  }
];

const OnboardingGuide: FC<OnboardingGuideProps> = ({ isOpen, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const step = ONBOARDING_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('notewise_onboarding_complete', 'true');
    onComplete?.();
    onClose();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#eff6ff]/80"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl mx-4 overflow-hidden"
        >
          {/* Background Gradient Card */}
          <div className="relative bg-white rounded-3xl border border-blue-200 shadow-sm overflow-hidden">

            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white text-blue-700 hover:bg-blue-50 hover:text-blue-900 transition-all z-10 border border-blue-200"
            >
              <FiX size={20} />
            </motion.button>

            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-100">
              <motion.div
                className="h-full bg-blue-600"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Content */}
            <div className="relative p-8 pt-12">
              {/* Step Indicator */}
              <div className="flex justify-center gap-2 mb-8">
                {ONBOARDING_STEPS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? 'bg-blue-600 w-8'
                        : index < currentStep
                        ? 'bg-blue-400'
                        : 'bg-blue-100'
                    }`}
                  />
                ))}
              </div>

              {/* Animated Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring' }}
                    className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-blue-50 border border-blue-200 text-blue-600 mb-6 shadow-sm"
                  >
                    {step.icon}
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="text-2xl md:text-3xl font-bold text-blue-900 mb-4"
                  >
                    {step.title}
                  </motion.h2>

                  {/* Description */}
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-blue-800 max-w-md mx-auto mb-8 leading-relaxed"
                  >
                    {step.description}
                  </motion.p>

                  {/* Features */}
                  {step.features && (
                    <motion.div
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.25 }}
                      className="grid grid-cols-2 gap-3 max-w-md mx-auto"
                    >
                      {step.features.map((feature, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + index * 0.05 }}
                          className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 text-left border border-blue-200"
                        >
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <FiCheck className="w-3 h-3 text-blue-600" />
                          </div>
                          <span className="text-sm text-blue-800">{feature}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-10">
                <button
                  onClick={handleSkip}
                  className="text-blue-700 hover:text-blue-900 text-sm font-medium transition-colors"
                >
                  Skip tutorial
                </button>

                <div className="flex items-center gap-3">
                  {!isFirstStep && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handlePrev}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-800 font-medium transition-all border border-blue-200"
                    >
                      <FiArrowLeft size={16} />
                      Back
                    </motion.button>
                  )}
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition-all"
                  >
                    {isLastStep ? (
                      <>
                        Get Started
                        <HiSparkles size={16} />
                      </>
                    ) : (
                      <>
                        Next
                        <FiArrowRight size={16} />
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingGuide;
