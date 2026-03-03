import { useState, type FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, BookOpen, Bookmark, Check, RotateCcw, Sparkles } from 'lucide-react';
import { EmptyState } from '../common';

// ============================================================================
// Types
// ============================================================================

interface FlashcardData {
  front: string;
  back: string;
}

interface FlashcardsProps {
  flashcards: FlashcardData[];
}

// ============================================================================
// Term-Based Flashcards Component
// ============================================================================

/**
 * Modern flashcards for key terms and concepts with clean, readable design.
 */
const Flashcards: FC<FlashcardsProps> = ({ flashcards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [learned, setLearned] = useState<Set<number>>(new Set());
  const [showResults, setShowResults] = useState(false);


  // Empty state
  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={<BookOpen size={48} className="text-indigo-400" />}
          title="No Key Terms Yet"
          description="Upload your content and click Assist AI to extract important terms and concepts."
        />
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleLearned = () => {
    setLearned(prev => new Set(prev).add(currentIndex));
    goNext();
  };

  const goNext = () => {
    setIsFlipped(false);
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const goPrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setLearned(new Set());
    setIsFlipped(false);
    setShowResults(false);
  };

  // Results view
  if (showResults) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl p-8 max-w-md w-full border border-gray-200 text-center"
        >
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-teal-500/20"
          >
            <BookOpen className="text-white" size={40} />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-white mb-2">All Terms Reviewed!</h2>
          <p className="text-gray-400 mb-6">Great job studying these concepts</p>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold text-emerald-400">{learned.size}</div>
              <div className="text-sm text-emerald-300">Learned</div>
            </div>
            <div className="bg-gray-200/50 border border-gray-200 rounded-xl p-4">
              <div className="text-3xl font-bold text-gray-400">{flashcards.length}</div>
              <div className="text-sm text-gray-500">Total Terms</div>
            </div>
          </div>

          <button
            onClick={resetSession}
            className="w-full py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} />
            Review Again
          </button>
        </motion.div>
      </div>
    );
  }

  // Study view
  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
            <BookOpen size={18} />
            <span className="font-semibold">Key Terms</span>
          </div>
          <div className="text-gray-400 text-sm">
            {currentIndex + 1} / {flashcards.length}
          </div>
        </div>
        
        {/* Learned count */}
        {learned.size > 0 && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            <Bookmark className="text-emerald-400" size={16} />
            <span className="text-emerald-400 font-semibold">{learned.size} learned</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-xl">
          {/* Card */}
          <motion.div
            className="relative h-80 cursor-pointer"
            onClick={handleFlip}
            style={{ perspective: '1200px' }}
          >
            <motion.div
              className="absolute inset-0 w-full h-full rounded-2xl"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
            >
              {/* Front - Term */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-white/10 p-8 flex flex-col items-center justify-center text-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="text-xs text-emerald-400 uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
                  <Sparkles size={14} />
                  Key Term
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
                  {currentCard.front}
                </h3>
                <div className="absolute bottom-6 text-gray-500 text-sm">
                  Tap to see explanation
                </div>
                {learned.has(currentIndex) && (
                  <div className="absolute top-4 right-4 bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    <Check size={12} />
                    Learned
                  </div>
                )}
              </div>

              {/* Back - Explanation */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 to-teal-900/30 rounded-2xl shadow-2xl border border-emerald-500/20 p-8 flex flex-col items-center justify-center text-center"
                style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
              >
                <div className="text-xs text-teal-400 uppercase tracking-widest font-semibold mb-4">
                  Explanation
                </div>
                <p className="text-lg md:text-xl text-white leading-relaxed">
                  {currentCard.back}
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Action Button */}
          <AnimatePresence>
            {isFlipped && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex justify-center mt-6"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); handleLearned(); }}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:opacity-90 transition shadow-lg shadow-emerald-500/20"
                >
                  <Check size={18} />
                  Got It!
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-6">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={() => { setIsFlipped(false); goNext(); }}
              disabled={currentIndex === flashcards.length - 1}
              className="p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom indicator */}
      <div className="flex justify-center gap-1.5 mt-4">
        {flashcards.map((_, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx === currentIndex 
                ? 'bg-emerald-400' 
                : learned.has(idx) 
                  ? 'bg-emerald-400/40' 
                  : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default Flashcards;
