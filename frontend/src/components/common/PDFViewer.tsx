import { useState, useEffect, useRef, type FC, useCallback } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjs from 'pdfjs-dist';
import { 
  FiZoomIn, 
  FiZoomOut, 
  FiChevronLeft, 
  FiChevronRight, 
  FiMaximize2, 
  FiMinimize2,
  FiDownload,
  FiRotateCw,
  FiLoader
} from 'react-icons/fi';
import '@react-pdf-viewer/core/lib/styles/index.css';

// ============================================================================
// Types
// ============================================================================

interface PDFViewerProps {
  /** PDF file to display */
  file?: File | null;
  /** PDF URL to display */
  url?: string | null;
  /** Callback when PDF is ready */
  onReady?: () => void;
  /** Callback when back button is clicked */
  onBack?: () => void;
  /** File name to display */
  fileName?: string;
}

// ============================================================================
// Constants
// ============================================================================

const PDF_WORKER_URL = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

// ============================================================================
// Component
// ============================================================================

/**
 * Modern, interactive PDF viewer with controls
 */
export const PDFViewer: FC<PDFViewerProps> = ({ 
  file, 
  url,
  onReady, 
  onBack,
  fileName 
}) => {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref for cleanup
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    // Set worker
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
  }, []);

  // Handle file loading
  useEffect(() => {
    let isMounted = true;
    
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        let pdfUrl = '';
        let numPages = 0;

        if (file) {
           // Create a new blob URL
           pdfUrl = URL.createObjectURL(file);
           urlRef.current = pdfUrl;
           
           // Get PDF info using pdfjs
           const arrayBuffer = await file.arrayBuffer();
           const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
           numPages = pdf.numPages;

        } else if (url) {
           pdfUrl = url;
           // Get PDF info from URL
           const pdf = await pdfjs.getDocument(url).promise;
           numPages = pdf.numPages;
        } else {
           // No file or URL
           setIsLoading(false);
           return;
        }

        if (!isMounted) {
          if (file && urlRef.current) URL.revokeObjectURL(urlRef.current);
          return;
        }
        
        setTotalPages(numPages);
        setFileUrl(pdfUrl);
        setCurrentPage(1);
        
        // Give the viewer time to start rendering
        setTimeout(() => {
          if (isMounted) {
            setIsLoading(false);
            onReady?.();
          }
        }, 300);
        
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (isMounted) {
          setError('Failed to load PDF. Please try again.');
          setIsLoading(false);
        }
      }
    };
    
    loadPdf();
    
    // Cleanup
    return () => {
      isMounted = false;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [file, url, onReady]);

  // ─────────────────────────────────────────────────────────────────────────
  // Zoom Controls
  // ─────────────────────────────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Page Navigation
  // ─────────────────────────────────────────────────────────────────────────
  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  // ─────────────────────────────────────────────────────────────────────────
  // Other Controls
  // ─────────────────────────────────────────────────────────────────────────
  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handleDownload = useCallback(() => {
    if (!fileUrl) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || (file ? file.name : 'document.pdf');
    link.click();
  }, [fileUrl, file, fileName]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // ─────────────────────────────────────────────────────────────────────────
  // Keyboard Shortcuts
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevPage();
          break;
        case 'ArrowRight':
          goToNextPage();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
          handleRotate();
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevPage, goToNextPage, handleZoomIn, handleZoomOut, handleRotate, toggleFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const zoomPercentage = Math.round(scale * 100);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col bg-white ${isFullscreen ? 'fixed inset-0 z-[9999]' : 'h-full rounded-2xl overflow-hidden'}`}
    >
      {/* Unified Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#f9f9f9] border-b border-[#e5e5e5] shrink-0 gap-4">
        {/* Left: Back Button + Filename */}
        <div className="flex items-center gap-3 min-w-0 flex-shrink">
          {onBack && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900 transition px-2 py-1 rounded-lg hover:bg-blue-50 shrink-0"
            >
              <FiChevronLeft size={16} />
              <span className="hidden sm:inline">Back</span>
            </motion.button>
          )}
          {fileName && (
            <>
              <div className="w-px h-5 bg-[#e5e5e5] hidden sm:block" />
              <span className="text-sm font-medium text-black truncate max-w-[200px]" title={fileName}>
                {fileName}
              </span>
            </>
          )}
        </div>

        {/* Center: Page Navigation */}
        <div className="flex items-center gap-1 shrink-0">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className={`p-1.5 rounded-lg transition-all ${
              currentPage <= 1 
                ? 'text-blue-300 cursor-not-allowed' 
                : 'text-blue-700 hover:bg-blue-50 hover:text-blue-900'
            }`}
          >
            <FiChevronLeft size={16} />
          </motion.button>
          
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-[#e5e5e5]">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value, 10);
                if (page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
              className="w-8 bg-transparent text-center text-black text-xs font-medium focus:outline-none"
            />
            <span className="text-[#555555] text-xs">/</span>
            <span className="text-[#555555] text-xs">{totalPages || '...'}</span>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className={`p-2 rounded-lg transition-all ${
              currentPage >= totalPages 
                ? 'text-blue-300 cursor-not-allowed' 
                : 'text-blue-700 hover:bg-blue-50 hover:text-blue-900'
            }`}
          >
            <FiChevronRight size={18} />
          </motion.button>
        </div>

        {/* Center: Zoom Controls */}
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className={`p-2 rounded-lg transition-all ${
              scale <= 0.5 
                ? 'text-blue-300 cursor-not-allowed' 
                : 'text-blue-700 hover:bg-blue-50 hover:text-blue-900'
            }`}
            title="Zoom Out (-)"
          >
            <FiZoomOut size={18} />
          </motion.button>
          
          <div className="px-4 py-1.5 bg-white rounded-lg border border-[#e5e5e5] text-sm font-medium text-black min-w-[70px] text-center">
            {zoomPercentage}%
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleZoomIn}
            disabled={scale >= 4}
            className={`p-2 rounded-lg transition-all ${
              scale >= 4 
                ? 'text-blue-300 cursor-not-allowed' 
                : 'text-blue-700 hover:bg-blue-50 hover:text-blue-900'
            }`}
            title="Zoom In (+)"
          >
            <FiZoomIn size={18} />
          </motion.button>
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRotate}
            className="p-2 rounded-lg text-blue-700 hover:bg-blue-50 hover:text-blue-900 transition-all"
            title="Rotate (R)"
          >
            <FiRotateCw size={18} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDownload}
            className="p-2 rounded-lg text-blue-700 hover:bg-blue-50 hover:text-blue-900 transition-all"
            title="Download"
          >
            <FiDownload size={18} />
          </motion.button>
          
          <div className="w-px h-6 bg-[#e5e5e5] mx-1" />
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-blue-700 hover:bg-blue-50 hover:text-blue-900 transition-all"
            title="Fullscreen (F)"
          >
            {isFullscreen ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
          </motion.button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-white custom-scrollbar relative min-h-0">
        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex items-center justify-center bg-white"
            >
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <FiLoader className="text-3xl text-blue-600" />
                </motion.div>
                <p className="text-[#555555] text-sm">Loading PDF...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        {fileUrl && !error && (
          <Worker workerUrl={PDF_WORKER_URL}>
            <div 
              className="flex justify-center py-4"
              style={{ 
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease'
              }}
            >
              <Viewer 
                fileUrl={fileUrl}
                defaultScale={scale}
                initialPage={currentPage - 1}
              />
            </div>
          </Worker>
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="px-4 py-2 bg-white border-t border-blue-200 flex items-center justify-center gap-6 text-xs text-blue-700 shrink-0">
        <span><kbd className="px-1.5 py-0.5 bg-blue-50 rounded text-blue-700 border border-blue-200">←</kbd> <kbd className="px-1.5 py-0.5 bg-blue-50 rounded text-blue-700 border border-blue-200">→</kbd> Navigate</span>
        <span><kbd className="px-1.5 py-0.5 bg-blue-50 rounded text-blue-700 border border-blue-200">+</kbd> <kbd className="px-1.5 py-0.5 bg-blue-50 rounded text-blue-700 border border-blue-200">-</kbd> Zoom</span>
        <span><kbd className="px-1.5 py-0.5 bg-blue-50 rounded text-blue-700 border border-blue-200">R</kbd> Rotate</span>
        <span><kbd className="px-1.5 py-0.5 bg-blue-50 rounded text-blue-700 border border-blue-200">F</kbd> Fullscreen</span>
      </div>
    </div>
  );
};

export default PDFViewer;
