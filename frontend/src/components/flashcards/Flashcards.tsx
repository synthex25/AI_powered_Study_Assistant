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
      <div className="h-full flex items-center justify-center p-12">
        <EmptyState
          icon={<BookOpen size={64} className="text-blue-700" />}
          title="Concept Library Empty"
          description="Initialize session content to extract core architectural terms and theoretical concepts."
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
      setTimeout(() => setCurrentIndex(currentIndex + 1), 100);
    } else {
      setShowResults(true);
    }
  };

  const goPrev = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setTimeout(() => setCurrentIndex(currentIndex - 1), 100);
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
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="glass-card p-12 max-w-lg w-full border-[#e5e5e5] text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-[#2563eb]" />

          <motion.div
            initial={{ y: -20, rotate: -10 }}
            animate={{ y: 0, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-[#f5f5f5] rounded-3xl flex items-center justify-center mx-auto mb-8 ring-1 ring-[#e5e5e5] shadow-sm"
          >
            <BookOpen className="text-blue-600" size={44} />
          </motion.div>

          <h2 className="text-4xl font-black text-blue-900 mb-2 tracking-tight">Review Cycle Complete</h2>
          <p className="text-blue-700 font-bold uppercase tracking-widest text-[10px] mb-10">Neural Retention Analysis</p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="glass-morphism border-[#bfdbfe] rounded-2xl p-6 bg-white">
              <div className="text-4xl font-black text-blue-600 mb-1">{learned.size}</div>
              <div className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Mastered</div>
            </div>
            <div className="glass-morphism border-[#bfdbfe] rounded-2xl p-6 bg-white">
              <div className="text-4xl font-black text-blue-900 mb-1">{flashcards.length}</div>
              <div className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Total Nodes</div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={resetSession}
            className="w-full py-4 px-6 btn-primary rounded-2xl shadow-sm flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest"
          >
            <RotateCcw size={18} />
            Re-Initialize Cycle
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // Study view
  return (
    <div className="h-full flex flex-col p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 glass-morphism border-[#e5e5e5] rounded-2xl flex items-center justify-center shadow-sm">
            <BookOpen size={24} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-blue-900 font-black text-xl tracking-tight">Concept Extraction</h2>
            <p className="text-blue-700 text-[10px] font-black uppercase tracking-widest">Term {currentIndex + 1} / {flashcards.length}</p>
          </div>
        </div>

        {/* Learned count */}
        <AnimatePresence>
          {learned.size > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 glass-morphism border-[#bfdbfe] bg-white px-5 py-2.5 rounded-2xl"
            >
              <Bookmark className="text-blue-600" size={18} />
              <span className="text-blue-900 font-black">{learned.size} <span className="text-blue-700">mastered</span></span>
            </motion.div>
          )}
        </AnimatePresence>
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

      {/* Card Area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl">
          {/* Card */}
          <motion.div
            className="relative h-[400px] cursor-pointer"
            onClick={handleFlip}
            style={{ perspective: '2000px' }}
          >
            <motion.div
              className="absolute inset-0 w-full h-full"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, type: 'spring', stiffness: 100, damping: 20 }}
            >
              {/* Front - Term */}
              <div
                className="absolute inset-0 glass-card border-[#bfdbfe] p-12 flex flex-col items-center justify-center text-center shadow-sm"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                  <Sparkles size={240} />
                </div>

                <div className="text-[10px] text-blue-700 uppercase tracking-[0.2em] font-black mb-6 flex items-center gap-3 py-2 px-4 glass-morphism border-[#bfdbfe] rounded-full">
                  <Sparkles size={14} />
                  Structural Concept
                </div>
                <h3 className="text-3xl md:text-5xl font-black text-blue-900 leading-tight tracking-tight mb-8">
                  {currentCard.front}
                </h3>
                <div className="mt-4 flex items-center gap-2 text-blue-700 text-xs font-bold uppercase tracking-widest group">
                  <span className="group-hover:text-blue-900 transition-colors">Analyze Definition</span>
                  <ChevronRight size={14} />
                </div>

                {learned.has(currentIndex) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  className="absolute top-8 right-8 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm"
                >
                    <Check size={14} className="stroke-[3px]" />
                    Validated
                  </motion.div>
                )}
              </div>

              {/* Back - Explanation */}
              <div
                className="absolute inset-0 glass-card border-[#bfdbfe] bg-white p-12 flex flex-col items-center justify-center text-center shadow-sm"
                style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
              >
                <div className="text-[10px] text-blue-700 uppercase tracking-[0.2em] font-black mb-8 px-4 py-2 glass-morphism border-[#bfdbfe] rounded-full">
                  Definition Data
                </div>
                <p className="text-xl md:text-2xl text-blue-800 leading-relaxed font-bold tracking-tight">
                  {currentCard.back}
                </p>
                <div className="mt-10 text-blue-700 text-[10px] font-black uppercase tracking-widest">
                  Tap to Revert
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Action Button */}
          <div className="h-24 flex items-center justify-center mt-12">
            <AnimatePresence mode="wait">
              {isFlipped ? (
                <motion.div
                  key="learned-btn"
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                >
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(16, 185, 129, 0.3)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => { e.stopPropagation(); handleLearned(); }}
                    className="flex items-center gap-3 px-12 py-5 btn-primary rounded-2xl font-black text-sm uppercase tracking-[0.1em] shadow-sm"
                  >
                    <Check size={20} className="stroke-[3px]" />
                    Commit to Neural Bank
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="flip-hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                className="text-blue-700 font-bold text-xs uppercase tracking-widest flex items-center gap-3"
                >
                  <div className="w-8 h-[1px] bg-[#d4d4d4]" />
                  Interact with card to define
                  <div className="w-8 h-[1px] bg-[#d4d4d4]" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-6 mt-4">
            <motion.button
              whileHover={{ scale: 1.1, x: -4 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              disabled={currentIndex === 0}
                className="w-14 h-14 rounded-2xl glass-morphism border-[#bfdbfe] text-blue-700 hover:text-blue-900 disabled:opacity-10 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm"
            >
              <ChevronLeft size={28} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1, x: 4 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); setIsFlipped(false); goNext(); }}
              disabled={currentIndex === flashcards.length - 1}
                className="w-14 h-14 rounded-2xl glass-morphism border-[#bfdbfe] text-blue-700 hover:text-blue-900 disabled:opacity-10 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-sm"
            >
              <ChevronRight size={28} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Bottom indicator */}
      <div className="flex justify-center gap-3 mt-12 px-12 overflow-x-auto py-4">
        {flashcards.map((_, idx) => (
          <motion.div
            key={idx}
            initial={false}
            animate={{
              width: idx === currentIndex ? 24 : 8,
            backgroundColor: idx === currentIndex ? '#2563eb' : learned.has(idx) ? 'rgba(37, 99, 235, 0.3)' : 'rgba(191, 219, 254, 0.6)'
            }}
            className="h-2 rounded-full transition-all duration-300 shrink-0"
          />
        ))}
      </div>
    </div>
  );
};


export default Flashcards;
