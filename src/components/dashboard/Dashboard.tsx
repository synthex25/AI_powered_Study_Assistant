import { useState, useRef, useEffect, useCallback, type FC, type ChangeEvent } from 'react';
import { FiVolume2, FiEdit2 } from 'react-icons/fi';
import { FaFilePdf, FaArrowLeft, FaCloudUploadAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import * as pdfjs from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import 'pdfjs-dist/build/pdf.worker.entry';
import Lottie from 'lottie-react';
import { message } from 'antd';

import { Header, Tabs } from '../layout';
import { ChatBox } from '../chat';
import { Quiz } from '../quiz';
import Flashcards from '../flashcards/Flashcards';
import { PDFViewer, Recommendation, EmptyState } from '../common';
import sendlottie from '../../assets/lottie/sendloading.json';
import axiosInstance from '../../config/axios';

// ============================================================================
// Types
// ============================================================================

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface FlashcardData {
  front: string;
  back: string;
}

interface VideoRecommendation {
  url: string;
  title: string;
}

interface WebRecommendation {
  url: string;
  title: string;
}

interface ProcessedTextEntry {
  content: string;
  title: string;
  quizzes: QuizQuestion[];
  flashcards: FlashcardData[];
}

interface ProcessedDocument {
  document_id: string;
  processed_text: ProcessedTextEntry[];
  youtube_links: VideoRecommendation[];
  website_links: WebRecommendation[];
}

interface AIResponse {
  documents: ProcessedDocument[];
}

type TabName = 'Original Content' | 'AI Notes' | 'AI Recomendation' | 'AI Flashcards' | 'AI Quizzes';

// ============================================================================
// Constants
// ============================================================================

const TABS: TabName[] = [
  'Original Content',
  'AI Notes',
  'AI Recomendation',
  'AI Flashcards',
  'AI Quizzes',
];

const FAST_API_URL = import.meta.env.VITE_FAST_API;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Remove emojis from text for speech synthesis
 */
const removeEmojis = (text: string): string => {
  return text.replace(/[\p{Emoji}\u200D\uFE0F]/gu, '');
};

/**
 * Check if TextItem has str property
 */
const isTextItem = (item: unknown): item is TextItem => {
  return typeof item === 'object' && item !== null && 'str' in item;
};

// ============================================================================
// Component
// ============================================================================

/**
 * Main dashboard component with PDF upload, AI processing, and content display
 */
const Dashboard: FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<TabName>('Original Content');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState('');
  const [aiTitle, setAiTitle] = useState('Untitled');
  const [aiQuizContent, setAiQuizContent] = useState<QuizQuestion[]>([]);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [aiFlashcardsContent, setAiFlashcardsContent] = useState<FlashcardData[]>([]);
  const [aiYoutubeContent, setAiYoutubeContent] = useState<VideoRecommendation[]>([]);
  const [websiteContent, setWebsiteContent] = useState<WebRecommendation[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiNotesContent, setAiNotesContent] = useState('');

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /**
   * Extract text from PDF file
   */
  const extractTextFromPDF = useCallback(async (file: File): Promise<void> => {
    try {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);

      reader.onload = async () => {
        if (!reader.result || typeof reader.result === 'string') return;

        const typedArray = new Uint8Array(reader.result);
        const pdf = await pdfjs.getDocument(typedArray).promise;
        let text = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .filter(isTextItem)
            .map((item) => item.str)
            .join(' ');
          text += pageText + ' ';
        }

        setPdfText(text.trim());
      };
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
    }
  }, []);

  /**
   * Process files with AI
   */
  const assistAI = async (files: File[]): Promise<void> => {
    try {
      if (!files || files.length === 0) {
        message.warning('No files selected!');
        return;
      }

      setAiLoading(true);
      
      // Generate a workspace ID for this upload (to link documents for chat)
      const uploadWorkspaceId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const formData = new FormData();

      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await axios.post<AIResponse>(
        `${FAST_API_URL}/upload_pdfs/?workspace_id=${uploadWorkspaceId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 5 * 60 * 1000,
        }
      );

      console.log('Processed AI Response:', response.data);

      // Extract content
      const concatenatedContent = response.data.documents
        .map((doc) =>
          doc.processed_text.map((entry) => entry.content).join('\n')
        )
        .join('\n\n');

      const quizContent = response.data.documents.flatMap((doc) =>
        doc.processed_text.flatMap((entry) => entry.quizzes)
      );

      const flashcardsContent = response.data.documents.flatMap((doc) =>
        doc.processed_text.flatMap((entry) => entry.flashcards)
      );

      const youtubeLinks = response.data.documents.flatMap(
        (doc) => doc.youtube_links
      );

      const websiteLinks = response.data.documents.flatMap(
        (doc) => doc.website_links
      );

      const newDocumentIds = response.data.documents.map(
        (doc) => doc.document_id
      );

      // Set title from first document
      const title = response.data.documents[0]?.processed_text[0]?.title || 'Untitled';
      setAiTitle(title.replace(/<[^>]+>/g, ''));

      // Update state
      setDocumentIds((prevIds) => [...prevIds, ...newDocumentIds]);
      setAiQuizContent(quizContent);
      setAiFlashcardsContent(flashcardsContent);
      setAiYoutubeContent(youtubeLinks);
      setWebsiteContent(websiteLinks);
      setAiNotesContent(concatenatedContent);

      // Update heatmap
      await axiosInstance.post('/master/heatmap', {
        date: new Date().toISOString().split('T')[0],
      });

      setAiLoading(false);
      message.success('AI Processing Completed! Check AI Notes tab.');
      setActiveTab('AI Notes');
    } catch (error) {
      setAiLoading(false);
      console.error('Error processing AI request:', error);
      message.error('Failed to process AI request.');
    }
  };

  /**
   * Handle file input change
   */
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFiles((prev) => [...prev, file]);
      setSelectedFile(file);
      extractTextFromPDF(file);
      setActiveTab('Original Content');
    }
  };

  /**
   * Open selected file
   */
  const openFile = (file: File): void => {
    setSelectedFile(file);
    extractTextFromPDF(file);
    setActiveTab('Original Content');
  };

  /**
   * Go back to file list
   */
  const goBack = (): void => {
    setSelectedFile(null);
    setPdfText('');
    setActiveTab('Original Content');
    setIsSpeaking(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  /**
   * Handle text-to-speech
   */
  const handleTextToSpeech = (): void => {
    let textToRead = '';
    console.log('🔹 Reading text...');

    setLoading(true);

    if (activeTab === 'AI Notes' && aiNotesContent) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(aiNotesContent, 'text/html');
      textToRead = doc.body.textContent || '';
      textToRead = removeEmojis(textToRead);
      setLoading(false);
    } else if (pdfText) {
      textToRead = removeEmojis(pdfText);
      setLoading(false);
    } else {
      setLoading(false);
      message.warning('No text found to read.');
      return;
    }

    if (window.speechSynthesis.speaking) {
      console.log('🔴 Stopping speech...');
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setLoading(false);
      return;
    }

    try {
      setIsSpeaking(true);

      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(textToRead);

      const voices = synth.getVoices();
      const preferredVoice = voices.find((voice) =>
        voice.name.includes('Google US English')
      ) || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 1;

      utterance.onend = () => {
        setIsSpeaking(false);
        setLoading(false);
        console.log('✅ Speech finished.');
      };

      synth.speak(utterance);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
      setIsSpeaking(false);
    }
  };

  /**
   * Trigger file input click
   */
  const triggerFileUpload = (): void => {
    fileInputRef.current?.click();
  };

  // Cleanup speech on unmount or tab change
  useEffect(() => {
    return () => {
      console.log('🛑 Component Unmounted: Stopping Speech!');
      setIsSpeaking(false);
      window.speechSynthesis.cancel();
    };
  }, [activeTab]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 overflow-hidden relative selection:bg-indigo-500/30 font-sans">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />
      <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Layout */}
      <div className="relative z-10 flex flex-col h-screen">
        <Header
          handleFileUpload={triggerFileUpload}
          title={aiTitle}
          setAiTitle={setAiTitle}
        />
        
        <input
          type="file"
          ref={fileInputRef}
          accept="application/pdf"
          className="hidden"
          onChange={handleFileUpload}
        />

        <main className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Left Panel - Content Area */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* Tabs & Controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                 <Tabs
                  tabs={TABS}
                  activeTab={activeTab}
                  setActiveTab={(tab) => setActiveTab(tab as TabName)}
                />
              </div>

               {/* Controls */}
               <div className="flex items-center gap-3">
                 {/* Volume Button */}
                  {activeTab !== 'Original Content' && activeTab !== 'AI Recomendation' && (
                    <motion.button
                       whileHover={{ scale: 1.1 }}
                       whileTap={{ scale: 0.9 }}
                       onClick={handleTextToSpeech}
                       className={`p-2.5 rounded-xl backdrop-blur-sm border transition-all ${
                        isSpeaking 
                          ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                          : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                       }`}
                       title={isSpeaking ? "Stop Reading" : "Read Aloud"}
                    >
                      <FiVolume2 className="text-xl" />
                    </motion.button>
                  )}
               </div>
            </div>

            {/* Main Content Card */}
            <div className="flex-1 bg-white/50 backdrop-blur-xl border border-gray-200 rounded-3xl overflow-hidden shadow-2xl relative group">
              
               {/* Loading Overlay */}
               <AnimatePresence>
                 {(loading || aiLoading) && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
                  >
                      <div className="bg-gray-100/50 p-8 rounded-3xl border border-gray-200 shadow-2xl flex flex-col items-center">
                      <Lottie
                        animationData={sendlottie}
                        loop
                        autoplay
                        style={{ width: 120, height: 120 }}
                      />
                      <p className="text-indigo-300 font-medium mt-4 animate-pulse">
                        {aiLoading ? 'AI Processing Document...' : 'Synthesizing Voice...'}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="h-full overflow-y-auto custom-scrollbar">
                {/* AI Notes Tab */}
                {activeTab === 'AI Notes' && (
                  aiNotesContent ? (
                    <div className="p-8">
                       <div
                        className="prose prose-invert max-w-none prose-headings:text-indigo-300 prose-a:text-purple-400 prose-strong:text-white"
                        dangerouslySetInnerHTML={{
                          __html: aiNotesContent.replace(/\n/g, ''),
                        }}
                      />
                    </div>
                  ) : (
                    <EmptyState
                      icon={<FiEdit2 className="text-4xl text-indigo-400" />}
                      title="No AI Notes Yet"
                      description="Upload a PDF and click Assist AI in original content to generate smart notes."
                    />
                  )
                )}

                {/* Original Content Tab */}
                {activeTab === 'Original Content' && (
                  selectedFile ? (
                    <div className="h-full flex flex-col">
                      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <button
                          type="button"
                          onClick={goBack}
                          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5"
                        >
                          <FaArrowLeft /> Back to Files
                        </button>
                        <span className="text-sm font-medium text-gray-300 truncate max-w-[300px]">{selectedFile.name}</span>
                      </div>
                      <div className="flex-1 bg-gray-100">
                        <PDFViewer file={selectedFile} />
                      </div>
                    </div>
                  ) : (
                    <div className="h-full p-8">
                      <div className="flex justify-between items-center mb-8">
                        <div>
                          <h3 className="text-2xl font-bold text-white">My Documents</h3>
                          <p className="text-gray-400 text-sm mt-1">Manage and process your uploaded PDFs</p>
                        </div>
                        
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => assistAI(uploadedFiles)}
                          disabled={uploadedFiles.length === 0}
                          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FiEdit2 />
                          <span>Generate AI Content</span>
                        </motion.button>
                      </div>
                      
                      {uploadedFiles.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {uploadedFiles.map((file, index) => (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              key={`file-${index}`}
                              className="bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all group"
                              onClick={() => openFile(file)}
                              role="button"
                              tabIndex={0}
                            >
                              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                                <FaFilePdf className="text-red-500 text-xl" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                                  {file.name}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(2)} KB
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-[400px] flex flex-col items-center justify-center text-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5 m-4">
                           <motion.div 
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            className="w-20 h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-indigo-500/20 text-indigo-400"
                           >
                              <FaCloudUploadAlt className="text-4xl" />
                           </motion.div>
                          <h4 className="text-xl font-bold text-white mb-2">No documents yet</h4>
                          <p className="text-gray-400 max-w-xs mb-6">
                            Upload a PDF document to start generating AI notes, quizzes, and flashcards.
                          </p>
                          <button 
                            onClick={triggerFileUpload}
                            className="px-6 py-2.5 bg-white text-slate-900 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                          >
                            Upload PDF
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}

                {/* Quiz Tab */}
                {activeTab === 'AI Quizzes' && (
                  <Quiz title={aiTitle} quizzes={aiQuizContent} setPdfText={setPdfText} />
                )}

                {/* Flashcards Tab */}
                {activeTab === 'AI Flashcards' && (
                  <div className="p-8">
                    <Flashcards flashcards={aiFlashcardsContent} setPdfText={setPdfText} />
                  </div>
                )}

                {/* Recommendations Tab */}
                {activeTab === 'AI Recomendation' && (
                  <div className="p-8">
                     <Recommendation youtubeData={aiYoutubeContent} webData={websiteContent} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - AI Chat Box */}
          <div className="flex-shrink-0">
            <ChatBox documentIds={documentIds} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
