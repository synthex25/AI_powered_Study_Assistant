import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { message } from 'antd';
import {
  FiEye,
  FiFileText,
  FiGlobe,
  FiLink,
  FiLogOut,
  FiPlusCircle,
  FiType,
  FiUpload,
  FiX,
} from 'react-icons/fi';
import { FaTrash } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';

import { Tabs } from '../layout';
import Logo from '../common/Logo';
import { ChatBox } from '../chat';
import { Quiz } from '../quiz';
import Flashcards from '../flashcards/Flashcards';
import {
  AIProcessingAnimation,
  EmptyState,
  ErrorBanner,
  OnboardingGuide,
  PDFViewer,
  Recommendation,
  ResearchNotes,
} from '../common';
import { ProfilePopup } from '../profile';
import WelcomeDashboard from './WelcomeDashboard';
import { useWorkspace } from '../../hooks';
import { clearUser, setHasSeenOnboarding } from '../../store/reducers/userReducer';
import { authService } from '../../services/authService';
import type { RootState } from '../../store/store';
import type { Source } from '../../types';

type TabName = 'Sources' | 'Notes' | 'Flashcards' | 'Quizzes' | 'Recommendations';
const TABS: TabName[] = ['Sources', 'Notes', 'Flashcards', 'Quizzes', 'Recommendations'];
const LANGUAGES = [
  ['en', 'English'],
  ['es', 'Spanish'],
  ['fr', 'French'],
  ['de', 'German'],
  ['it', 'Italian'],
  ['pt', 'Portuguese'],
  ['zh', 'Chinese'],
  ['ja', 'Japanese'],
  ['ko', 'Korean'],
  ['ru', 'Russian'],
] as const;

const StudyPlayground: FC = () => {
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
    clearError,
  } = useWorkspace();
  const { id: routeWorkspaceId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.persisted.user.user);

  const [activeTab, setActiveTab] = useState<TabName>('Sources');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [outputLanguage, setOutputLanguage] = useState('en');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [progressStage, setProgressStage] = useState('started');
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [urlError, setUrlError] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textInput, setTextInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sources = workspace?.sources || [];
  const documentIds = workspace?._id ? [workspace._id] : [];
  const aiNotes = workspace?.generatedContent?.notes || '';
  const aiFlashcards = workspace?.generatedContent?.flashcards || [];
  const aiQuiz = (workspace?.generatedContent?.quizzes || []).map((q) => ({
    question: q.question,
    options: q.options,
    answer: q.correctAnswer || 'A',
    explanation: q.explanation || '',
  }));

  const stats = useMemo(
    () => ({
      pdf: sources.filter((s) => s.type === 'pdf').length,
      text: sources.filter((s) => s.type === 'text').length,
      url: sources.filter((s) => s.type === 'url').length,
      generated: Boolean(workspace?.generatedContent?.notes),
    }),
    [sources, workspace?.generatedContent?.notes],
  );

  useEffect(() => {
    if (user && !user.hasSeenOnboarding) {
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [user]);

  const completeOnboarding = async () => {
    setShowOnboarding(false);
    try {
      await authService.completeOnboarding();
      dispatch(setHasSeenOnboarding(true));
    } catch {
      dispatch(setHasSeenOnboarding(true));
    }
  };

  useEffect(() => {
    if (!wsGenerating || !workspace?._id) return;
const FASTAPI_URL =
  import.meta.env.VITE_AI_URL ||
  import.meta.env.VITE_FASTAPI_URL;
    const eventSource = new EventSource(`${FASTAPI_URL}/api/progress/stream/${workspace._id}`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress !== -1) {
          setProgressStage(data.stage);
          setProgressPercent(data.progress);
          setProgressMessage(data.message);
        }
      } catch {
        // ignore parse errors
      }
    };
    return () => {
      eventSource.close();
      setProgressStage('started');
      setProgressPercent(0);
      setProgressMessage('');
    };
  }, [wsGenerating, workspace?._id]);

  useEffect(() => {
    if (workspace?.language) setOutputLanguage(workspace.language);
  }, [workspace?.language]);

  useEffect(() => {
    const syncWorkspace = async () => {
      if (routeWorkspaceId) {
        if (routeWorkspaceId !== workspace?._id) await loadWorkspace(routeWorkspaceId);
      } else if (workspace) {
        setWorkspace(null);
      }
    };
    syncWorkspace();
  }, [routeWorkspaceId, workspace?._id, loadWorkspace, setWorkspace]);

  const triggerFileUpload = () => {
    if (!workspace) {
      message.warning('Create or select a workspace first.');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !workspace) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds 10MB limit. Please choose a smaller PDF.');
      return;
    }
    setUploadError(null);
    setPdfLoading(true);
    try {
      await uploadPdf(file);
      if (event.target) event.target.value = '';
    } finally {
      setPdfLoading(false);
    }
  };

  const handleProcessAI = async () => {
    if (!workspace) return;
    clearError();
    const result = await generateContent();
    if (result) setActiveTab('Notes');
  };

  const addUrlSource = async () => {
    setUrlError('');
    const url = urlInput.trim();
    if (!url) return setUrlError('Please enter a URL.');
    if (!url.startsWith('http://') && !url.startsWith('https://')) return setUrlError('URL must start with http:// or https://');
    try {
      new URL(url);
      setPdfLoading(true);
      try {
        await addUrl(url, urlTitle.trim() || undefined);
        setUrlInput('');
        setUrlTitle('');
        setShowUrlModal(false);
      } finally {
        setPdfLoading(false);
      }
    } catch {
      setUrlError('Invalid URL format.');
    }
  };

  const addTextSource = async () => {
    if (!textInput.trim()) return;
    setPdfLoading(true);
    try {
      await addText(textTitle.trim() || 'Untitled Note', textInput);
      setTextInput('');
      setTextTitle('');
      setShowTextModal(false);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleRemoveSource = async (sourceId: string) => {
    await removeSource(sourceId);
    if (selectedSource?._id === sourceId) {
      setSelectedSource(null);
      setSelectedFile(null);
      setPdfUrl(null);
    }
  };

  const previewSource = async (source: Source) => {
    setSelectedSource(source);
    if (source.type === 'pdf' && workspace) {
      setPdfLoading(true);
      try {
        const url = await getSourceUrl(source._id);
        if (url) {
          setPdfUrl(url);
          setSelectedFile(null);
          setActiveTab('Original Content');
        }
      } finally {
        setPdfLoading(false);
      }
    } else if (source.type === 'url' && source.sourceUrl) {
      window.open(source.sourceUrl, '_blank');
    } else if (source.type === 'text') {
      setShowTextPreview(true);
    }
  };

  const handleLanguageChange = (language: string) => {
    setOutputLanguage(language);
    if (workspace) {
      setWorkspace((prev) => (prev ? { ...prev, language } : prev));
      updateWorkspace({ language }, true);
    }
  };

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) await authService.logout(refreshToken);
    } catch {
      // ignore backend logout errors
    }
    localStorage.clear();
    dispatch(clearUser());
    navigate('/?auth=login');
  };

  // Dashboard (no workspace) = 2 cols; workspace view = 3 cols with chat panel
  const gridCols = workspace ? '260px 1fr 380px' : '260px 1fr';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: gridCols,
      gridTemplateRows: '1fr',
      height: '100vh',
      overflow: 'hidden',
    }}>
      <AIProcessingAnimation isProcessing={wsGenerating} message={progressMessage || 'AI is processing your workspace...'} stage={progressStage as any} progress={progressPercent} />

      {/* ── LEFT SIDEBAR (col 1) ── */}
      <aside style={{
        width: 260, minWidth: 260, maxWidth: 260,
        height: '100vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '1.25rem',
        background: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        flexShrink: 0,
        overflow: 'hidden',
      }}>

        {/* ── TOP: Logo + workspace list ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0, flex: 1, overflow: 'hidden' }}>

          {/* Logo + Home */}
          <div style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: '1rem',
            flexShrink: 0,
          }}>
            <button type="button" onClick={() => navigate('/dashboard')} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Logo size="md" />
            </button>
            <button
              type="button"
              className="sidebar-item mt-3"
              onClick={() => navigate('/dashboard')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <FiPlusCircle size={15} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Workspace Home</span>
            </button>
          </div>

          {/* Workspace list — scrollable middle section */}
          <div style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            padding: '1rem',
            flex: 1, minHeight: 0,
            display: 'flex', flexDirection: 'column', gap: 8,
            overflow: 'hidden',
          }}>
            <p style={{
              fontSize: '0.7rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: '#9ca3af',
              padding: '0 4px', marginBottom: 4, flexShrink: 0,
            }}>Workspaces</p>

            <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {workspaces.map((item) => {
                const isActive = workspace?._id === item._id;
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => navigate(`/workspace/${item._id}`)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '0.55rem 0.75rem', borderRadius: 10, cursor: 'pointer',
                      border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
                      background: isActive ? '#eff6ff' : 'transparent',
                      color: isActive ? '#2563eb' : '#374151',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.85rem',
                      transition: 'all 0.18s ease',
                      textAlign: 'left',
                      boxShadow: 'none',
                      flexShrink: 0,
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f3f4f6'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <FiFileText size={13} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── BOTTOM: Quick Actions ── */}
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: '1rem',
          marginTop: '1rem',
          flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <p style={{
            fontSize: '0.7rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: '#9ca3af',
            padding: '0 4px', marginBottom: 4,
          }}>Quick Actions</p>

          {[
            { icon: <FiUpload size={13} />, label: 'Upload PDF', onClick: triggerFileUpload,           disabled: !workspace },
            { icon: <FiLink   size={13} />, label: 'Add URL',    onClick: () => setShowUrlModal(true),  disabled: !workspace },
            { icon: <FiType   size={13} />, label: 'Add Text',   onClick: () => setShowTextModal(true), disabled: !workspace },
          ].map(({ icon, label, onClick, disabled }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              disabled={disabled}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '0.5rem 0.75rem', borderRadius: 10,
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: '1px solid transparent',
                background: 'transparent',
                color: disabled ? '#d1d5db' : '#374151',
                fontSize: '0.85rem', fontWeight: 500,
                transition: 'all 0.18s ease',
                textAlign: 'left',
              }}
              onMouseEnter={e => { if (!disabled) { (e.currentTarget as HTMLElement).style.background = '#f3f4f6'; (e.currentTarget as HTMLElement).style.color = '#111827'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = disabled ? '#d1d5db' : '#374151'; }}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={handleProcessAI}
            disabled={!workspace || !sources.length}
            style={{
              width: '100%', marginTop: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '0.65rem 1rem', borderRadius: 999,
              background: (!workspace || !sources.length) ? '#eff6ff' : '#2563eb',
              border: '1px solid #d1d5db',
              color: (!workspace || !sources.length) ? '#9ca3af' : '#ffffff',
              fontSize: '0.875rem', fontWeight: 700,
              cursor: (!workspace || !sources.length) ? 'not-allowed' : 'pointer',
              boxShadow: 'none',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { if (workspace && sources.length) (e.currentTarget as HTMLElement).style.background = '#1f2937'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = (!workspace || !sources.length) ? '#eff6ff' : '#2563eb'; }}
          >
            <HiSparkles size={15} />
            Generate Content
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT (col 2) ── */}
      <div style={{
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
        className="custom-scrollbar"
      >
        {/* Topbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 40, flexShrink: 0,
          margin: '1.25rem 1.25rem 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 14,
          padding: '0.75rem 1rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          {/* Left — breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
            <button type="button" onClick={() => navigate('/dashboard')} className="btn-ghost"
              style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>Dashboard</button>
            {workspace && (
              <>
                <span style={{ color: '#d1d5db', fontSize: '0.875rem' }}>/</span>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                  {workspace.name}
                </p>
              </>
            )}
          </div>

          {/* Right — user profile card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 12, padding: '6px 10px 6px 8px',
          }}>
            <span style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: '#2563eb',
              display: 'grid', placeItems: 'center',
              fontSize: '0.7rem', fontWeight: 700, color: '#fff',
              cursor: 'pointer',
            }}
              onClick={() => setIsProfileOpen(true)}
            >
              {user?.name?.slice(0, 2).toUpperCase() || 'US'}
            </span>
            <button type="button" onClick={() => setIsProfileOpen(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 600, color: '#111827',
                maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: 0,
              }}
            >
              {user?.name || 'User'}
            </button>
            <span style={{ width: 1, height: 18, background: '#e5e7eb', flexShrink: 0 }} />
            <button type="button" onClick={handleLogout}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 600, color: '#dc2626',
                padding: '2px 4px', borderRadius: 6, transition: 'color 0.15s ease',
              }}
            >
              <FiLogOut size={13} /> Logout
            </button>
          </div>
        </header>

        <input type="file" ref={fileInputRef} accept="application/pdf" className="hidden" onChange={handleFileUpload} />

        {(wsError || uploadError) && (
          <div style={{ margin: '0.75rem 1.25rem 0' }}>
            <ErrorBanner
              error={uploadError || wsError}
              type="error"
              onDismiss={() => (uploadError ? setUploadError(null) : clearError())}
              onRetry={uploadError ? undefined : () => { clearError(); workspace ? handleProcessAI() : loadWorkspaces(); }}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {workspace ? (
            <motion.section
              key="workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                padding: '1.25rem',
                maxWidth: '100%',
                minWidth: 0,
              }}
            >
              {/* Stats row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: '0.75rem',
              }}>
                  {[
                    { label: 'PDF Sources',  value: stats.pdf },
                    { label: 'Text Sources', value: stats.text },
                    { label: 'URL Sources',  value: stats.url },
                    { label: 'AI Notes',     value: stats.generated ? 'Ready' : 'Pending' },
                  ].map(({ label, value }) => (
                    <article
                      key={label}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 14,
                        background: '#ffffff',
                        border: '1px solid #e5e7eb',
                        display: 'flex', flexDirection: 'column', gap: 4,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'border-color 0.2s ease, transform 0.2s ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#bfdbfe'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                    >
                      <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', margin: 0 }}>
                        {label}
                      </p>
                      <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1 }}>
                        {value}
                      </p>
                    </article>
                  ))}
                </div>

                {/* Tabs */}
                <Tabs tabs={TABS} activeTab={activeTab} setActiveTab={(tab) => setActiveTab(tab as TabName)} />

                {/* Main content card */}
                <div
                  className="card"
                  style={{
                    minHeight: 480,
                    overflow: 'hidden',
                    borderRadius: 16,
                    position: 'relative',
                  }}
                >
                  {(pdfLoading || wsGenerating) && (
                    <div style={{
                      position: 'absolute', inset: 0, zIndex: 20,
                      background: 'rgba(255,255,255,0.9)',
                      display: 'grid', placeItems: 'center',
                      fontSize: '0.875rem', color: '#374151',
                    }}>Processing...</div>
                  )}
                  <div style={{ height: '100%', overflowY: 'auto' }} className="custom-scrollbar">
                    {activeTab === 'Notes' && (aiNotes
                      ? <div style={{ padding: '1.5rem' }}><ResearchNotes content={aiNotes} /></div>
                      : <EmptyState icon={<FiFileText />} title="No notes yet" description="Generate content from sources to see study notes." />
                    )}
                    {activeTab === 'Sources' && (
                      selectedFile || pdfUrl ? (
                        <PDFViewer file={selectedFile} url={pdfUrl} onBack={() => { setSelectedFile(null); setPdfUrl(null); }} fileName={selectedSource?.name || 'Document.pdf'} />
                      ) : (
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          {/* Source Repository header */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0 }}>
                              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Source Repository</h3>
                              <p style={{ fontSize: '0.8rem', color: 'rgba(226,232,240,0.45)', marginTop: 2 }}>Manage sources and run AI generation.</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
                              {[
                                { label: 'Add URL',    icon: <FiLink size={13} />,   onClick: () => setShowUrlModal(true) },
                                { label: 'Add Text',   icon: <FiType size={13} />,   onClick: () => setShowTextModal(true) },
                                { label: 'Upload PDF', icon: <FiUpload size={13} />, onClick: triggerFileUpload },
                              ].map(({ label, icon, onClick }) => (
                                <button key={label} type="button" onClick={onClick} style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 6,
                                  padding: '0.4rem 0.85rem', borderRadius: 999,
                                  background: '#f3f4f6', border: '1px solid #d1d5db',
                                  color: '#374151', fontSize: '0.78rem', fontWeight: 600,
                                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                                }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#e5e7eb'; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f3f4f6'; }}
                                >{icon} {label}</button>
                              ))}
                              <button type="button" onClick={handleProcessAI} disabled={!sources.length} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '0.4rem 0.9rem', borderRadius: 999,
                                background: sources.length ? '#2563eb' : '#eff6ff',
                                border: '1px solid #d1d5db',
                                color: sources.length ? '#ffffff' : '#9ca3af',
                                fontSize: '0.78rem', fontWeight: 700,
                                cursor: sources.length ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease',
                              }}><HiSparkles size={13} /> Generate AI</button>
                            </div>
                          </div>
                          {/* Sources grid or empty state */}
                          {sources.length ? (
                            <div style={{ borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                              {/* Header row */}
                              <div style={{
                                display: 'grid', gridTemplateColumns: '2fr 0.7fr 1fr 1.2fr',
                                background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '0.6rem 1rem',
                              }}>
                                {['Source', 'Type', 'Created', 'Actions'].map(h => (
                                  <span key={h} style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af' }}>{h}</span>
                                ))}
                              </div>
                              {/* Data rows */}
                              {sources.map((source, i) => (
                                <div key={source._id}
                                  style={{
                                    display: 'grid', gridTemplateColumns: '2fr 0.7fr 1fr 1.2fr',
                                    alignItems: 'center', padding: '0.7rem 1rem',
                                    borderBottom: i < sources.length - 1 ? '1px solid #f3f4f6' : 'none',
                                    transition: 'background 0.15s ease',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <div style={{ minWidth: 0, paddingRight: 8 }}>
                                    <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{source.name}</p>
                                    <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: 0, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {source.type === 'url' ? source.sourceUrl : source.type === 'text' ? source.extractedTextPreview?.slice(0, 60) : 'PDF source'}
                                    </p>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', textTransform: 'uppercase' }}>
                                      {source.type}
                                    </span>
                                  </div>
                                  <div><span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{new Date(source.createdAt).toLocaleDateString()}</span></div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <button type="button" onClick={() => previewSource(source)}
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0.3rem 0.7rem', borderRadius: 8, background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease' }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#e5e7eb'; }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f3f4f6'; }}
                                    >
                                      <FiEye size={11} /> Preview
                                    </button>
                                    <button type="button" onClick={() => handleRemoveSource(source._id)}
                                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer', transition: 'all 0.15s ease' }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
                                    >
                                      <FaTrash size={10} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <EmptyState icon={<FiUpload />} title="No sources yet" description="Upload a PDF, add URL, or paste text to begin." action={<button type="button" className="btn-primary" onClick={triggerFileUpload}><FiUpload />Upload first PDF</button>} />
                          )}
                        </div>
                      )
                    )}
                    {activeTab === 'Quizzes'        && <div style={{ padding: '1.25rem' }}><Quiz title={workspace.name} quizzes={aiQuiz} /></div>}
                    {activeTab === 'Flashcards'     && <div style={{ padding: '1.25rem' }}><Flashcards flashcards={aiFlashcards} /></div>}
                    {activeTab === 'Recommendations' && <div style={{ padding: '1.25rem' }}><Recommendation youtubeData={workspace.generatedContent?.youtube_links} webData={workspace.generatedContent?.website_links} recommendations={workspace.generatedContent?.recommendations} /></div>}
                  </div>
                </div>
            </motion.section>
          ) : (
            <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, padding: '1.25rem' }}>
              <WelcomeDashboard workspaces={workspaces} wsLoading={wsLoading} wsError={wsError} createWorkspace={createWorkspace} deleteWorkspace={deleteWorkspace} loadWorkspaces={loadWorkspaces} newWorkspaceName={newWorkspaceName} setNewWorkspaceName={setNewWorkspaceName} message={message} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── RIGHT PANEL ── */}
      {workspace && (
        <div className="app-right-panel"
          style={{
            width: 380, minWidth: 380, maxWidth: 380,
            height: '100vh', flexShrink: 0,
            padding: '1.25rem',
            borderLeft: '1px solid #e5e7eb',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: '#ffffff',
          }}
        >
          <ChatBox documentIds={documentIds} />
        </div>
      )}

      <AnimatePresence>{showUrlModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => { setShowUrlModal(false); setUrlError(''); }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="card w-full max-w-lg p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-semibold">Add URL Source</h3><button type="button" className="btn-ghost" onClick={() => setShowUrlModal(false)}><FiX /></button></div>
            <label className="form-group"><span className="form-label">Title (optional)</span><input value={urlTitle} onChange={(event) => setUrlTitle(event.target.value)} placeholder="e.g. Intro article" /></label>
            <label className="form-group mt-3"><span className="form-label">URL</span><input value={urlInput} onChange={(event) => { setUrlInput(event.target.value); setUrlError(''); }} placeholder="https://example.com/article" /></label>
            {urlError && <p className="form-error mt-2">{urlError}</p>}
            <div className="flex items-center justify-end gap-2 mt-5"><button type="button" className="btn-secondary" onClick={() => setShowUrlModal(false)}>Cancel</button><button type="button" className="btn-primary" onClick={addUrlSource}><FiGlobe />Add</button></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <AnimatePresence>{showTextModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => setShowTextModal(false)}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="card w-full max-w-xl p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-semibold">Add Text Source</h3><button type="button" className="btn-ghost" onClick={() => setShowTextModal(false)}><FiX /></button></div>
            <label className="form-group"><span className="form-label">Title</span><input value={textTitle} onChange={(event) => setTextTitle(event.target.value)} placeholder="e.g. Class notes" /></label>
            <label className="form-group mt-3"><span className="form-label">Text</span><textarea value={textInput} onChange={(event) => setTextInput(event.target.value)} rows={8} placeholder="Paste notes here..." /></label>
            <div className="flex items-center justify-end gap-2 mt-5"><button type="button" className="btn-secondary" onClick={() => setShowTextModal(false)}>Cancel</button><button type="button" className="btn-primary" onClick={addTextSource}><FiType />Add</button></div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <AnimatePresence>{showTextPreview && selectedSource?.type === 'text' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => setShowTextPreview(false)}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="card w-full max-w-3xl p-6 max-h-[80vh] overflow-hidden flex flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-semibold truncate">{selectedSource.name}</h3><button type="button" className="btn-ghost" onClick={() => setShowTextPreview(false)}><FiX /></button></div>
            <div className="card-muted rounded-xl p-4 overflow-y-auto custom-scrollbar text-sm whitespace-pre-wrap" style={{ color: '#374151' }}>{selectedSource.extractedTextPreview || 'No preview available.'}</div>
          </motion.div>
        </motion.div>
      )}</AnimatePresence>

      <AnimatePresence>{isProfileOpen && <ProfilePopup onClose={() => setIsProfileOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{showOnboarding && <OnboardingGuide isOpen={showOnboarding} onClose={completeOnboarding} onComplete={completeOnboarding} />}</AnimatePresence>
    </div>
  );
};

export default StudyPlayground;
