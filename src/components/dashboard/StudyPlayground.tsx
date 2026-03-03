import { useState, useRef, useEffect, type FC, type ChangeEvent } from 'react';
import { flushSync } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiX, FiLink, FiGlobe, FiEye, FiType, FiLogOut, FiChevronRight } from 'react-icons/fi';
import { FaFilePdf, FaCloudUploadAlt, FaTrash } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import { message } from 'antd';

import { Tabs } from '../layout';
import Logo from '../common/Logo';
import { ChatBox } from '../chat';
import { Quiz } from '../quiz';
import Flashcards from '../flashcards/Flashcards';
import { PDFViewer, Recommendation, EmptyState, ResearchNotes, AIProcessingAnimation, ErrorBanner, OnboardingGuide } from '../common';
import { ProfilePopup } from '../profile';
import sendlottie from '../../assets/lottie/sendloading.json';
import { useWorkspace } from '../../hooks';
import { clearUser, setHasSeenOnboarding } from '../../store/reducers/userReducer';
import { authService } from '../../services/authService';
import type { Source } from '../../types';
import type { RootState } from '../../store/store';
import WelcomeDashboard from './WelcomeDashboard';

// ============================================================================
// Types
// ============================================================================





type TabName = 'Original Content' | 'AI Notes' | 'AI Flashcards' | 'AI Quizzes' | 'AI Recommendations';

// ============================================================================
// Constants
// ============================================================================

const TABS: TabName[] = ['Original Content', 'AI Notes', 'AI Flashcards', 'AI Quizzes', 'AI Recommendations'];



const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
];

// ============================================================================
// Helper Functions
// ============================================================================



// ============================================================================
// Component
// ============================================================================

const StudyPlayground: FC = () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Workspace Integration (Primary Data Source)
  // ─────────────────────────────────────────────────────────────────────────
  const {
    workspace,
    workspaces,
    loading: wsLoading,
    generating: wsGenerating,
    error: wsError,
    createWorkspace,
    deleteWorkspace,
    loadWorkspace,
    loadWorkspaces,
    uploadPdf,
    addText,
    addUrl,
    removeSource,
    updateWorkspace,
    generateContent,
    getSourceUrl,
    setWorkspace,
    clearError
  } = useWorkspace();

  const { id: routeWorkspaceId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Get user from Redux store
  const user = useSelector((state: RootState) => state.persisted.user.user);
  
  // ─────────────────────────────────────────────────────────────────────────
  // UI State
  // ─────────────────────────────────────────────────────────────────────────
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>('Original Content');
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Content State (Derived/Local)

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [aiTitle, setAiTitle] = useState('Untitled');
  
  // Modals & Inputs
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPreparingFile, setIsPreparingFile] = useState(false);

  // Check for first-time user and show onboarding (from database via Redux)
  useEffect(() => {
    // Only show onboarding if user exists and hasn't seen it
    // Note: !user.hasSeenOnboarding handles both false AND undefined (for existing users)
    if (user && !user.hasSeenOnboarding) {
      // Delay slightly to let the UI render first
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Handle onboarding completion - call API and update Redux
  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    try {
      await authService.completeOnboarding();
      dispatch(setHasSeenOnboarding(true));
    } catch (error) {
      console.error('Failed to mark onboarding complete:', error);
      // Still update local state so user isn't stuck
      dispatch(setHasSeenOnboarding(true));
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Derived Data
  // ─────────────────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState('en'); // Moved from Chat State

  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const didSelectFile = useRef(false);

  // SSE Progress State
  const [progressStage, setProgressStage] = useState<string>('started');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');

  // Connect to SSE progress stream when generating
  useEffect(() => {
    if (!wsGenerating || !workspace?._id) return;

    const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';
    const eventSource = new EventSource(`${FASTAPI_URL}/api/progress/stream/${workspace._id}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress !== -1) { // -1 is heartbeat
          setProgressStage(data.stage);
          setProgressPercent(data.progress);
          setProgressMessage(data.message);
        }
      } catch (e) {
        console.warn('[SSE] Failed to parse progress:', e);
      }
    };

    eventSource.onerror = () => {
      console.warn('[SSE] Connection error, closing...');
      eventSource.close();
    };

    return () => {
      eventSource.close();
      // Reset progress when done
      setProgressStage('started');
      setProgressPercent(0);
      setProgressMessage('');
    };
  }, [wsGenerating, workspace?._id]);

  // Derived Values
  const contentSources = workspace?.sources || [];
  const aiLoading = wsGenerating;
  const aiNotesContent = workspace?.generatedContent?.notes || '';
  const documentIds = workspace?._id ? [workspace._id] : [];

  const aiFlashcardsContent = workspace?.generatedContent?.flashcards || [];
  const aiYoutubeContent = workspace?.generatedContent?.youtube_links || [];
  const websiteContent = workspace?.generatedContent?.website_links || [];

  // Map backend quiz format to frontend component format (includes explanation)
  const aiQuizContent = (workspace?.generatedContent?.quizzes || []).map(q => ({
    question: q.question,
    options: q.options,
    answer: q.correctAnswer || 'A',
    explanation: q.explanation || ''
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // Sync Effects (URL -> State) - Single Source of Truth
  // ─────────────────────────────────────────────────────────────────────────
  
  // Sync AI title from workspace
  useEffect(() => {
    if (workspace?.generatedContent?.title) {
      setAiTitle(workspace.generatedContent.title);
    } else if (workspace?.name) {
      setAiTitle(workspace.name);
    }
  }, [workspace]);

  // Sync language from workspace
  useEffect(() => {
    if (workspace?.language && workspace.language !== outputLanguage) {
      setOutputLanguage(workspace.language);
    }
  }, [workspace?.language, outputLanguage]);

  // Sync workspace state with URL parameters
  useEffect(() => {
    const syncWorkspaceWithRoute = async () => {
      if (routeWorkspaceId) {
        // If we have an ID and it's different from current state, load it
        if (routeWorkspaceId !== workspace?._id) {
          await loadWorkspace(routeWorkspaceId);
        }
      } else if (workspace) {
        // If we are on /dashboard but have a workspace state, clear it
        setWorkspace(null);
      }
    };

    syncWorkspaceWithRoute();
  }, [routeWorkspaceId, loadWorkspace, workspace?._id, setWorkspace]);

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────
  


  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  // File Upload - Max 10MB
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    console.log('File upload triggered');
    const file = event.target.files?.[0];
    
    // Select is complete
    didSelectFile.current = true;
    setIsPreparingFile(false);
    
    if (file && workspace) {
      // File size validation
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const errorMsg = `File size (${fileSizeMB}MB) exceeds the ${MAX_FILE_SIZE_MB}MB limit. Please upload a smaller file.`;
        console.error('File size exceeded:', errorMsg);
        setUploadError(errorMsg); // Show in ErrorBanner
        message.error(errorMsg, 5);
        if (event.target) event.target.value = '';
        return;
      }
      
      setUploadError(null); // Clear any previous upload error
      console.log('File selected:', file.name, 'Size:', (file.size / (1024 * 1024)).toFixed(2) + 'MB');
      setPdfLoading(true);
      try {
        await uploadPdf(file);
        // Clear the input value so the same file can be uploaded again if needed
        if (event.target) event.target.value = '';
      } catch (e) {
        console.error('Upload failed:', e);
      } finally {
        setPdfLoading(false);
      }
    } else if (!workspace) {
      message.warning('Please select or create a workspace first');
    }
  };

  const triggerFileUpload = () => {
    if (!workspace) {
      message.warning('Create a workspace first');
      return;
    }
    
    // Use flushSync to force the overlay to render BEFORE we call click()
    // This makes the UI feel much more responsive.
    flushSync(() => {
      setIsPreparingFile(true);
    });
    didSelectFile.current = false;
    
    // Fail-safe handler: detect when user returns to window if onCancel fails
    const onReturnToWindow = () => {
      console.log('[Upload] Focus returned to window');
      // Use a delay to allow handleFileUpload to run first on slow systems
      setTimeout(() => {
        // ONLY clear if a file was NOT selected. 
        if (!didSelectFile.current) {
          console.log('[Upload] Fail-safe: No file selected after 2s, clearing overlay');
          setIsPreparingFile(false);
        }
        window.removeEventListener('focus', onReturnToWindow);
      }, 2000);
    };
    window.addEventListener('focus', onReturnToWindow);

    // Trigger the file picker immediately
    fileInputRef.current?.click();
  };

  // Content Generation
  const handleProcessAI = async () => {
    if (!workspace) return;
    clearError(); // Clear any previous errors
    try {
      const result = await generateContent();
      if (result) {
        setActiveTab('AI Notes');
      }
    } catch (error: unknown) {
      console.error('Error generating content:', error);
      // Error is already set by generateContent via the hook
    }
  };

  // Source Management
  const [urlError, setUrlError] = useState('');
  
  const addUrlSource = async () => {
    const trimmedUrl = urlInput.trim();
    setUrlError(''); // Clear previous error
    
    if (!trimmedUrl) {
      setUrlError('Please enter a URL');
      return;
    }

    // Basic format check
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      setUrlError('URL must start with http:// or https://');
      return;
    }

    try {
      new URL(trimmedUrl); // Validate format
      if (workspace) {
        setPdfLoading(true);
        try {
          await addUrl(trimmedUrl, urlTitle.trim() || undefined);
          setUrlInput('');
          setUrlTitle('');
          setShowUrlModal(false);
        } finally {
          setPdfLoading(false);
        }
      }
    } catch {
      setUrlError('Invalid URL format. Example: https://example.com/article');
    }
  };

  const addTextSource = async () => {
    if (!textInput.trim() || !workspace) return;
    setPdfLoading(true);
    try {
      await addText(textTitle || 'Untitled Note', textInput);
      setTextInput('');
      setTextTitle('');
      setShowTextModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleRemoveSource = async (sourceId: string) => {
    if (workspace) {
      await removeSource(sourceId);
      if (selectedSource?._id === sourceId) {
          setSelectedSource(null);
          setSelectedFile(null);
          setPdfUrl(null);
      }
    }
  };

  const previewSource = async (source: Source) => {
    setSelectedSource(source);
    
    if (source.type === 'pdf') {
       if (!workspace) return;
       setPdfLoading(true);
       try {
         // Fetch signed URL
         const url = await getSourceUrl(source._id);
           if (url) {
             setPdfUrl(url);
             setSelectedFile(null);
             setActiveTab('Original Content');
           }
       } catch (e) {
         console.error('Failed to get signed URL', e);
         message.error('Failed to load PDF');
       } finally {
         setPdfLoading(false);
       }
    } else if (source.type === 'url') {
       if (source.sourceUrl) {
         window.open(source.sourceUrl, '_blank');
       }
    } else if (source.type === 'text') {
       setShowTextPreview(true);
    }
  };




  // Chat Handlers
  const updateSessionLanguage = (lang: string) => {
    setOutputLanguage(lang);
    if (workspace) {
      // Optimistically update workspace language in background
      setWorkspace(prev => prev ? { ...prev, language: lang } : prev);
      updateWorkspace({ language: lang }, true);
    }
  };

  const handleLogout = async () => {
    try {
      // Revoke refresh token on backend first
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch (e) {
      // Ignore errors - continue with local logout
      console.warn('Failed to revoke token on server:', e);
    }
    
    localStorage.clear();
    dispatch(clearUser());
    navigate('/?auth=login');
  };

  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  // Reset functionality
  const goBack = () => {
    setSelectedFile(null);
    setPdfUrl(null);
    setActiveTab('Original Content');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 overflow-hidden relative selection:bg-indigo-500/30 font-sans">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none" />
      <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* AI Processing Animation */}
      <AIProcessingAnimation 
        isProcessing={wsGenerating} 
        message={progressMessage || "AI is analyzing your content..."}
        stage={progressStage as any}
        progress={progressPercent}
      />

      <div className="relative z-10 flex h-screen">
        {/* ───────────────────────────────────────────────────────────────────
            Main Content Area
        ─────────────────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
          {/* Header */}
          <header className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-200 relative z-50 gap-4 sm:gap-0">
            {/* Left: Menu + Workspace Selector */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-4">
              <div 
                onClick={handleLogoClick}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Logo size="sm" />
              </div>

              <div className="flex items-center gap-2 sm:hidden">
                 {/* Mobile specific controls if any */}
              </div>

              {workspace && (
                <>
                  <div className="h-6 w-px bg-white/10 mx-1" />
                  <div className="flex items-center gap-1.5">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleLogoClick}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
                      title="Back to Dashboard"
                    >
                      <span>Workspace</span>
                      <FiChevronRight size={16} className="text-gray-500 group-hover:text-white transition-colors" />
                    </motion.button>
                    <span className="text-sm font-bold text-white max-w-[200px] truncate px-1">
                      {workspace.name}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Center: Placeholder for balance */}
            <div className="flex-shrink-0" />

            {/* Right: Language + User Controls */}
            <div className="flex items-center justify-center sm:justify-end w-full sm:w-auto gap-3">
              {workspace && (
                <div className="relative">
                  <select
                    value={outputLanguage}
                    onChange={(e) => updateSessionLanguage(e.target.value)}
                    className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 sm:py-2 pr-8 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer hover:bg-white/10 transition"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code} className="bg-gray-200">
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )}
              
              {workspace && <div className="h-6 w-px bg-white/10 hidden sm:block" />}
              
              <motion.button
                onClick={() => setIsProfileOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] cursor-pointer"
              >
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-800 font-bold text-xs sm:text-sm hover:bg-transparent transition-colors">
                  JD
                </div>
              </motion.button>

              <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 sm:p-2.5 rounded-xl hover:bg-red-500/10 transition text-gray-400 hover:text-red-400 group"
                title="Logout"
              >
                <FiLogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
            </div>
          </header>

          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf"
            className="hidden"
            onChange={handleFileUpload}
            /// @ts-ignore - cancel event is supported but missing in some types
            onCancel={() => {
              console.log('File selection cancelled');
              didSelectFile.current = false;
              setIsPreparingFile(false);
            }}
          />

          {/* Content Layout */}
          <main className="flex-1 flex flex-col overflow-hidden relative bg-gray-50">
            {/* Error Banner */}
            {(wsError || uploadError) && (
              <div className="px-4 lg:px-6 pt-4">
                <ErrorBanner
                  error={uploadError || wsError}
                  type="error"
                  onDismiss={() => {
                    if (uploadError) setUploadError(null);
                    else clearError();
                  }}
                  onRetry={uploadError ? undefined : () => {
                    clearError();
                    if (workspace) {
                      handleProcessAI();
                    } else {
                      loadWorkspaces();
                    }
                  }}
                />
              </div>
            )}

            <AnimatePresence mode="wait">
              {workspace ? (
                <motion.div
                  key="workspace-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 p-3 lg:p-6 overflow-hidden min-h-0"
                >
                  {/* Left Panel - Content Area */}
                <div className="flex-1 flex flex-col gap-4 lg:gap-6 min-w-0 h-full">
                  {/* Tabs & Controls */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <Tabs
                        tabs={TABS}
                        activeTab={activeTab}
                        setActiveTab={(tab) => setActiveTab(tab as TabName)}
                      />
                    </div>

                  </div>

                  {/* Main Content Card */}
                  <div className="flex-1 bg-white/50 backdrop-blur-xl border border-gray-200 rounded-3xl overflow-hidden shadow-2xl relative">
                    <AnimatePresence>
                      {(aiLoading || pdfLoading || isPreparingFile) && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center"
                        >
                          <div className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center">
                            {isPreparingFile ? (
                              <>
                                <div className="relative w-20 h-20 mb-4">
                                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"></div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <FaFilePdf className="text-indigo-400" size={32} />
                                  </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 text-center">Preparing File...</h3>
                                <p className="text-gray-400 text-sm max-w-[200px] text-center">
                                  System is accessing the selected file. This may take a moment.
                                </p>
                                <button
                                  onClick={() => setIsPreparingFile(false)}
                                  className="mt-6 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : pdfLoading ? (
                              <>
                                <div className="relative w-20 h-20 mb-4">
                                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
                                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin"></div>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <FaFilePdf className="text-indigo-400" size={32} />
                                  </div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 text-center">Uploading PDF...</h3>
                                <p className="text-gray-400 text-sm max-w-[200px] text-center">
                                  Sending your content to the cloud for analysis.
                                </p>
                              </>
                            ) : (
                              <>
                                <div className="w-24 h-24 mb-4">
                                  <Lottie animationData={sendlottie} loop={true} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2 text-center">AI is Researching...</h3>
                                <p className="text-gray-400 text-sm max-w-[220px] text-center leading-relaxed">
                                  Our deep learning models are analyzing your sources to generate comprehensive study materials.
                                </p>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="h-full overflow-y-auto custom-scrollbar">
                      {/* AI Notes Tab */}
                      {activeTab === 'AI Notes' && (
                        aiNotesContent ? (
                          <div className="p-4 lg:p-6">
                            <ResearchNotes content={aiNotesContent} />
                          </div>
                        ) : (
                          <EmptyState
                            icon={<FiEdit2 className="text-4xl text-indigo-400" />}
                            title="No Research Notes Yet"
                            description="Upload your content and click Assist AI to generate comprehensive research notes with diagrams and interactive elements."
                          />
                        )
                      )}

                      {/* Original Content Tab */}
                      {activeTab === 'Original Content' && (
                        selectedFile || pdfUrl ? (
                          <div className="h-full flex flex-col min-h-0">
                            <PDFViewer 
                              file={selectedFile}
                              url={pdfUrl}
                              onReady={() => setPdfLoading(false)}
                              onBack={goBack}
                              fileName={selectedFile?.name || selectedSource?.name || 'Document.pdf'}
                            />
                          </div>
                        ) : (
                          <div className="h-full p-8">
                            {/* Header with actions */}
                            <div className="flex justify-between items-center mb-6">
                              <div>
                                <h3 className="text-2xl font-bold text-white">My Content</h3>
                                <p className="text-gray-400 text-sm mt-1">
                                  PDFs, URLs, and more - all your knowledge sources
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Compact action buttons */}
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setShowUrlModal(true)}
                                  className="p-2.5 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/30 text-gray-400 hover:text-indigo-400 rounded-xl transition-all"
                                  title="Add URL"
                                >
                                  <FiLink size={18} />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => setShowTextModal(true)}
                                  className="p-2.5 bg-white/5 hover:bg-green-500/20 border border-white/10 hover:border-green-500/30 text-gray-400 hover:text-green-400 rounded-xl transition-all"
                                  title="Add Text"
                                >
                                  <FiType size={18} />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={triggerFileUpload}
                                  className="p-2.5 bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 text-gray-400 hover:text-purple-400 rounded-xl transition-all"
                                  title="Upload PDF"
                                >
                                  <FaCloudUploadAlt size={18} />
                                </motion.button>
                                
                                <div className="w-px h-6 bg-white/10 mx-1" />
                                
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  type="button"
                                  onClick={handleProcessAI}
                                  disabled={!workspace || contentSources.length === 0}
                                  className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                  <HiSparkles size={16} />
                                  <span>Generate</span>
                                </motion.button>
                              </div>
                            </div>

                            {/* URL Modal */}
                            <AnimatePresence>
                              {showUrlModal && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[300]"
                                  onClick={() => { setShowUrlModal(false); setUrlError(''); }}
                                >
                                  <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                                  >
                                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                      <FiGlobe className="text-indigo-400" />
                                      Add URL Source
                                    </h4>
                                    <input
                                      type="text"
                                      value={urlTitle}
                                      onChange={(e) => setUrlTitle(e.target.value)}
                                      placeholder="Source Title (e.g., Biology Article)"
                                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 mb-3"
                                    />
                                    <input
                                      type="url"
                                      value={urlInput}
                                      onChange={(e) => { setUrlInput(e.target.value); setUrlError(''); }}
                                      placeholder="https://example.com/article"
                                      className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none ${
                                        urlError ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-indigo-500/50'
                                      }`}
                                    />
                                    {urlError && (
                                      <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                                        <span>⚠️</span> {urlError}
                                      </p>
                                    )}
                                    <div className="flex gap-3 justify-end mt-4">
                                      <button onClick={() => { setShowUrlModal(false); setUrlError(''); }} className="px-4 py-2 text-gray-400 hover:text-white transition">Cancel</button>
                                      <button onClick={addUrlSource} className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium">Add URL</button>
                                    </div>
                                  </motion.div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Text Modal */}
                            <AnimatePresence>
                              {showTextModal && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[300]"
                                  onClick={() => setShowTextModal(false)}
                                >
                                  <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
                                  >
                                    <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                      <FiType className="text-green-400" />
                                      Add Text Content
                                    </h4>
                                    <input
                                      type="text"
                                      value={textTitle}
                                      onChange={(e) => setTextTitle(e.target.value)}
                                      placeholder="Title (optional)"
                                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 mb-3 text-sm"
                                    />
                                    <textarea
                                      value={textInput}
                                      onChange={(e) => setTextInput(e.target.value)}
                                      placeholder="Paste your text content here..."
                                      rows={6}
                                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/50 mb-4 resize-none"
                                    />
                                    <div className="flex gap-3 justify-end">
                                      <button onClick={() => setShowTextModal(false)} className="px-4 py-2 text-gray-400 hover:text-white transition">Cancel</button>
                                      <button onClick={addTextSource} className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium">Add Text</button>
                                    </div>
                                  </motion.div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Text Preview Modal */}
                            <AnimatePresence>
                              {showTextPreview && selectedSource?.type === 'text' && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-[300]"
                                  onClick={() => setShowTextPreview(false)}
                                >
                                  <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] shadow-2xl flex flex-col"
                                  >
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-lg font-bold text-white flex items-center gap-2">
                                        <FiType className="text-green-400" />
                                        {selectedSource.name}
                                      </h4>
                                      <button onClick={() => setShowTextPreview(false)} className="text-gray-400 hover:text-white"><FiX size={18} /></button>
                                    </div>
                                    <div className="flex-1 overflow-auto bg-white/5 rounded-xl p-4 border border-white/10">
                                      <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{selectedSource.extractedTextPreview || 'No preview available'}</p>
                                    </div>
                                  </motion.div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Content Sources Grid */}
                            {contentSources.length > 0 ? (
                              <div className="flex flex-col gap-3">
                                {contentSources.map((source, index) => (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    key={source._id}
                                    className="bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 rounded-xl p-3 transition-all group"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                        source.type === 'pdf' ? 'bg-red-500/10 group-hover:bg-red-500/20' : 
                                        source.type === 'text' ? 'bg-green-500/10 group-hover:bg-green-500/20' : 
                                        'bg-blue-500/10 group-hover:bg-blue-500/20'
                                      }`}>
                                        {source.type === 'pdf' ? <FaFilePdf className="text-red-500 text-lg" /> : 
                                         source.type === 'text' ? <FiType className="text-green-400 text-lg" /> : 
                                         <FiGlobe className="text-blue-400 text-lg" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <button 
                                          onClick={() => previewSource(source)}
                                          className="text-left font-medium text-gray-200 truncate text-sm hover:text-indigo-400 hover:underline cursor-pointer transition-all block w-full"
                                        >
                                          {source.name}
                                        </button>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                          {source.type === 'text' ? `${source.extractedTextPreview?.substring(0, 40) || 'Text'}...` : 
                                           source.type === 'pdf' ? (source.name.length > 50 ? source.name.substring(0, 50) + '...' : source.name) : (source.sourceUrl && source.sourceUrl.length > 30 ? source.sourceUrl.substring(0, 30) + '...' : source.sourceUrl)}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => previewSource(source)} className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-gray-400 hover:text-indigo-400 transition" title="Preview"><FiEye size={14} /></button>
                                        <button onClick={() => handleRemoveSource(source._id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition" title="Remove"><FaTrash size={12} /></button>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            ) : (
                              <div className="h-[400px] flex flex-col items-center justify-center text-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5">
                                <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className="w-20 h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-indigo-500/20 text-indigo-400">
                                  <FaCloudUploadAlt className="text-4xl" />
                                </motion.div>
                                <h4 className="text-xl font-bold text-white mb-2">No content yet</h4>
                                <p className="text-gray-400 max-w-xs mb-6">Add PDFs or URLs to start generating AI notes, quizzes, and flashcards.</p>
                                <div className="flex gap-3">
                                  <button onClick={() => setShowUrlModal(true)} className="px-5 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 transition flex items-center gap-2"><FiLink size={16} /> Add URL</button>
                                  <button onClick={triggerFileUpload} className="px-5 py-2.5 bg-white text-slate-900 rounded-xl font-bold hover:bg-gray-100 transition flex items-center gap-2"><FaCloudUploadAlt size={16} /> Upload PDF</button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      )}

                      {/* Quiz Tab */}
                      {activeTab === 'AI Quizzes' && (
                        <Quiz title={aiTitle} quizzes={aiQuizContent} />
                      )}

                      {/* Flashcards Tab */}
                      {activeTab === 'AI Flashcards' && (
                        <div className="p-8">
                          <Flashcards flashcards={aiFlashcardsContent} />
                        </div>
                      )}

                      {/* Recommendations Tab */}
                      {activeTab === 'AI Recommendations' && (
                        <div className="p-8">
                          <Recommendation 
                            youtubeData={aiYoutubeContent} 
                            webData={websiteContent} 
                            recommendations={workspace?.generatedContent?.recommendations}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                  {/* Right Section - AI Chat Box */}
                  <div className="flex-shrink-0 w-full lg:w-[450px] h-full">
                    <ChatBox documentIds={documentIds} />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="welcome-dashboard"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex-1 flex"
                >
                  <WelcomeDashboard 
                    workspaces={workspaces}
                    wsLoading={wsLoading}
                    wsError={wsError}
                    createWorkspace={createWorkspace}
                    deleteWorkspace={deleteWorkspace}
                    loadWorkspaces={loadWorkspaces}
                    newWorkspaceName={newWorkspaceName}
                    setNewWorkspaceName={setNewWorkspaceName}
                    message={message}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <ProfilePopup onClose={() => setIsProfileOpen(false)} />
        )}
      </AnimatePresence>

      {/* Onboarding Guide */}
      <OnboardingGuide 
        isOpen={showOnboarding} 
        onClose={handleOnboardingComplete}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
};

export default StudyPlayground;
