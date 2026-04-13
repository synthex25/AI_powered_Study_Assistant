import { useState, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import { message } from 'antd';
import { Brain, ChevronRight, Trophy, Target, RotateCcw, CheckCircle, XCircle, Lightbulb } from 'lucide-react';

import correctAnimation from '../../assets/lottie/correct.json';
import wrongAnimation from '../../assets/lottie/wrong.json';
import { masterService } from '../../services';
import { EmptyState } from '../common';

// ============================================================================
// Types
// ============================================================================

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

interface QuizProps {
  quizzes: QuizQuestion[];
  title: string;
}

type SelectedAnswers = Record<number, string>;

// ============================================================================
// Modern Quiz Component
// ============================================================================

const Quiz: FC<QuizProps> = ({ quizzes, title }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<SelectedAnswers>({});
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);


  // Get correct answer letter from options
  const getCorrectLetter = (quiz: QuizQuestion): string => {
    const answer = quiz.answer;
    // If answer is already a letter (A, B, C, D)
    if (['A', 'B', 'C', 'D'].includes(answer.toUpperCase())) {
      return answer.toUpperCase();
    }
    // If answer is the full option text, find the index
    const index = quiz.options.findIndex(opt =>
      opt.toLowerCase().includes(answer.toLowerCase()) ||
      answer.toLowerCase().includes(opt.toLowerCase().replace(/^[a-d]\)\s*/i, ''))
    );
    if (index !== -1) {
      return ['A', 'B', 'C', 'D'][index];
    }
    return 'A';
  };

  const handleAnswer = (optionIndex: number): void => {
    if (selectedAnswers[currentQuestion] !== undefined) return;

    const currentQuiz = quizzes[currentQuestion];
    const correctLetter = getCorrectLetter(currentQuiz);
    const selectedLetter = ['A', 'B', 'C', 'D'][optionIndex];
    const isAnswerCorrect = selectedLetter === correctLetter;

    setSelectedAnswers(prev => ({ ...prev, [currentQuestion]: selectedLetter }));
    setIsCorrect(isAnswerCorrect);
    setShowAnimation(true);

    setTimeout(() => {
      setShowAnimation(false);
      setShowExplanation(true);
    }, 1500);
  };

  const handleNext = (): void => {
    setShowExplanation(false);
    if (currentQuestion < quizzes.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = (): void => {
    setShowExplanation(false);
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = async (): Promise<void> => {
    try {
      setIsSubmitting(true);

      const totalScore = quizzes.length;
      const obtainedScore = Object.entries(selectedAnswers).filter(
        ([index, answer]) => {
          const quiz = quizzes[Number(index)];
          return answer === getCorrectLetter(quiz);
        }
      ).length;

      await masterService.updateQuiz({
        title,
        totalScore,
        obtainedScore,
        date: new Date().toISOString().split('T')[0],
      });

      message.success(`Knowledge Assessment Synchronized! Score: ${obtainedScore}/${totalScore}`);
      resetQuiz();
    } catch (error) {
      console.error('Error submitting quiz:', error);
      message.error('Failed to sync knowledge assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setIsCorrect(null);
    setShowAnimation(false);
    setShowExplanation(false);
    setShowResults(false);
  };

  // Empty state
  if (!quizzes || quizzes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <EmptyState
          icon={<Brain size={64} className="text-blue-700" />}
          title="Neural Bank Empty"
          description="Provision source content to generate specialized academic assessments."
        />
      </div>
    );
  }

  const currentQuiz = quizzes[currentQuestion];
  const selectedOption = selectedAnswers[currentQuestion];
  const correctLetter = getCorrectLetter(currentQuiz);
  const progress = ((currentQuestion + 1) / quizzes.length) * 100;
  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = Object.entries(selectedAnswers).filter(
    ([index, answer]) => answer === getCorrectLetter(quizzes[Number(index)])
  ).length;

  // Results view
  if (showResults) {
    const percentage = Math.round((correctCount / quizzes.length) * 100);
    const grade = percentage >= 90 ? 'S+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : 'F';

    return (
      <div className="h-full flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="glass-card p-12 max-w-xl w-full border-[#e5e5e5] text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-[#2563eb]" />

          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-[#f5f5f5] rounded-3xl flex items-center justify-center mx-auto mb-8 ring-1 ring-[#e5e5e5] shadow-sm"
          >
            <Trophy className="text-blue-600" size={48} />
          </motion.div>

          <h2 className="text-4xl font-black text-black mb-2 tracking-tight">Assessment Complete</h2>
          <p className="text-[#555555] font-bold uppercase tracking-widest text-xs mb-10">Neural Compatibility Analysis</p>

          {/* Score Circle */}
          <div className="relative w-40 h-40 mx-auto mb-10">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="8" fill="none" className="text-[#e5e5e5]" />
              <motion.circle
                cx="80" cy="80" r="72"
                stroke="url(#quiz-gradient)"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                initial={{ strokeDasharray: '0 452' }}
                animate={{ strokeDasharray: `${(percentage / 100) * 452} 452` }}
                transition={{ duration: 1.5, delay: 0.4, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="quiz-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-black">{percentage}%</span>
              <span className="text-xs font-black text-[#2563eb] uppercase tracking-widest mt-1">Rank: {grade}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="glass-morphism border-[#e5e5e5] rounded-2xl p-6 bg-white">
              <div className="flex items-center justify-center gap-3 mb-2">
                <CheckCircle className="text-emerald-600" size={20} />
                <span className="text-3xl font-black text-black">{correctCount}</span>
              </div>
              <div className="text-[10px] font-black text-[#555555] uppercase tracking-widest">Validations</div>
            </div>
            <div className="glass-morphism border-[#e5e5e5] rounded-2xl p-6 bg-white">
              <div className="flex items-center justify-center gap-3 mb-2">
                <XCircle className="text-red-600" size={20} />
                <span className="text-3xl font-black text-black">{quizzes.length - correctCount}</span>
              </div>
              <div className="text-[10px] font-black text-[#555555] uppercase tracking-widest">Anomalies</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={resetQuiz}
              className="flex-1 py-4 px-6 glass-morphism border-[#e5e5e5] text-black font-bold rounded-2xl hover:bg-[#f5f5f5] transition flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              Re-Analyze
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmitQuiz}
              disabled={isSubmitting}
              className="btn-primary flex-1 py-4 px-6 rounded-2xl shadow-2xl disabled:opacity-50"
            >
              {isSubmitting ? 'Syncing...' : 'Sync to Neural Hub'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Quiz view
  return (
    <div className="h-full flex flex-col p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 glass-morphism border-[#e5e5e5] rounded-2xl flex items-center justify-center shadow-sm">
            <Brain size={24} className="text-[#2563eb]" />
          </div>
          <div>
            <h2 className="text-black font-black text-xl tracking-tight">{title || 'Academic Probe'}</h2>
            <p className="text-[#555555] text-[10px] font-black uppercase tracking-widest">Assessment Node {currentQuestion + 1} / {quizzes.length}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 glass-morphism border-[#e5e5e5] bg-white px-5 py-2.5 rounded-2xl">
          <Target className="text-[#2563eb]" size={18} />
          <span className="text-black font-black">{correctCount} <span className="text-[#555555]">/</span> {answeredCount}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-[#f5f5f5] rounded-full mb-12 overflow-hidden ring-1 ring-[#e5e5e5]">
        <motion.div
          className="h-full bg-[#2563eb]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Question Card */}
      <div className="flex-1 flex flex-col">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1"
        >
          <div className="glass-card border-[#e5e5e5] p-10 mb-8 relative overflow-hidden min-h-[400px] flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <Brain size={200} className="rotate-12" />
            </div>

            <h3 className="text-2xl md:text-3xl font-extrabold text-black mb-10 leading-snug tracking-tight z-10">
              {currentQuiz.question}
            </h3>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 z-10">
              {currentQuiz.options.map((option, index) => {
                const letters = ['A', 'B', 'C', 'D'];
                const letter = letters[index];
                const isSelected = selectedOption === letter;
                const isCorrectAnswer = letter === correctLetter;
                const hasAnswered = selectedOption !== undefined;

                let optionClass = 'glass-morphism border-[#e5e5e5] text-black hover:border-[#2563eb] hover:bg-[#f5f5f5]';

                if (hasAnswered) {
                  if (isCorrectAnswer) {
                    optionClass = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 ring-2 ring-emerald-500/20';
                  } else if (isSelected) {
                    optionClass = 'bg-red-500/10 border-red-500/40 text-red-300 ring-2 ring-red-500/20';
                  } else {
                    optionClass = 'glass-morphism border-[#e5e5e5] opacity-30 scale-95';
                  }
                }

                return (
                  <motion.button
                    key={index}
                    whileHover={!hasAnswered ? { scale: 1.02, x: 4 } : {}}
                    whileTap={!hasAnswered ? { scale: 0.98 } : {}}
                    onClick={() => handleAnswer(index)}
                    disabled={hasAnswered}
                    className={`w-full p-5 rounded-2xl border transition-all flex items-center gap-5 text-left ${optionClass}`}
                  >
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${hasAnswered && isCorrectAnswer
                        ? 'bg-emerald-600 text-white'
                        : hasAnswered && isSelected
                          ? 'bg-red-600 text-white'
                          : 'bg-[#f5f5f5] text-[#2563eb] group-hover:text-black transition-colors'
                      }`}>
                      {letter}
                    </span>
                    <span className="flex-1 font-bold text-base text-black">{option.replace(/^[A-D]\)\s*/i, '')}</span>
                    {hasAnswered && isCorrectAnswer && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle className="text-emerald-600" size={24} /></motion.div>
                    )}
                    {hasAnswered && isSelected && !isCorrectAnswer && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><XCircle className="text-red-600" size={24} /></motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {showExplanation && currentQuiz.explanation && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-10 p-6 glass-morphism border-[#e5e5e5] bg-white rounded-2xl"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#f5f5f5] flex items-center justify-center shrink-0">
                      <Lightbulb className="text-[#2563eb]" size={20} />
                    </div>
                    <div>
                      <h4 className="text-[#2563eb] font-extrabold text-sm uppercase tracking-widest mb-1">Knowledge Synthesis</h4>
                      <p className="text-[#444444] text-base leading-relaxed font-medium">{currentQuiz.explanation}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Animation Overlay */}
        <AnimatePresence>
          {showAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-white/80 flex items-center justify-center z-[100]"
            >
              <Lottie
                animationData={isCorrect ? correctAnimation : wrongAnimation}
                loop={false}
                autoplay
                style={{ width: 300, height: 300 }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-auto pt-8 border-t border-[#e5e5e5]">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="px-8 py-4 rounded-2xl glass-morphism border-[#e5e5e5] text-[#555555] hover:text-black disabled:opacity-20 disabled:cursor-not-allowed transition-all font-bold text-sm uppercase tracking-widest"
          >
            Previous Node
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(99, 102, 241, 0.3)' }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            disabled={selectedOption === undefined}
            className="btn-primary min-w-[180px] px-8 py-4 rounded-2xl text-white font-black flex items-center justify-center gap-3 disabled:opacity-20 disabled:grayscale transition-all text-sm uppercase tracking-widest"
          >
            {currentQuestion === quizzes.length - 1 ? 'Analyze Results' : 'Next Node'}
            <ChevronRight size={20} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};


export default Quiz;
