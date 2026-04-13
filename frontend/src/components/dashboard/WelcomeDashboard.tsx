import { useMemo, useState, type FC } from 'react';
import { motion } from 'framer-motion';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { FiArrowRight, FiFolder, FiLoader, FiLayers } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

import type { Workspace } from '../../types';
import Logo from '../common/Logo';

interface WelcomeDashboardProps {
  workspaces: Workspace[];
  wsLoading: boolean;
  wsError?: string | null;
  createWorkspace: (name: string, description?: string) => Promise<Workspace | null>;
  deleteWorkspace: (id: string) => Promise<any>;
  loadWorkspaces?: () => void;
  newWorkspaceName: string;
  setNewWorkspaceName: (name: string) => void;
  message: any;
}

const LANGUAGE_MAP: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
};

const WelcomeDashboard: FC<WelcomeDashboardProps> = ({
  workspaces,
  wsLoading,
  wsError,
  createWorkspace,
  deleteWorkspace,
  newWorkspaceName,
  setNewWorkspaceName,
}) => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const totalSources = useMemo(
    () => workspaces.reduce((sum, workspace) => sum + (workspace.sources?.length ?? 0), 0),
    [workspaces],
  );
  const generatedCount = useMemo(
    () => workspaces.filter((workspace) => workspace.generatedContent?.notes).length,
    [workspaces],
  );

  const createNewWorkspace = async () => {
    const trimmed = newWorkspaceName.trim();
    if (!trimmed) return;

    setCreateError(null);
    setIsCreating(true);
    try {
      const workspace = await createWorkspace(trimmed);
      setNewWorkspaceName('');
      if (workspace?._id) {
        navigate(`/workspace/${workspace._id}`);
      }
    } catch (error: any) {
      setCreateError(error?.message || 'Unable to create workspace right now.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }} className="custom-scrollbar">
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* ── Header card ─────────────────────────────────────────────────── */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 20,
          padding: '1.75rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
          flexWrap: 'wrap',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          {/* Left — title + description */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <Logo size="lg" showText={false} className="mb-3" />
            <h1 style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', fontWeight: 800, color: '#111827', letterSpacing: '-0.03em', margin: 0 }}>
              Workspace Dashboard
            </h1>
            <p style={{ color: '#6b7280', marginTop: 8, fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 480 }}>
              Keep every subject in its own workspace, add sources, and generate AI notes, quizzes, and flashcards from one place.
            </p>
          </div>

          {/* Right — stats row */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Workspaces', value: workspaces.length },
              { label: 'Sources',    value: totalSources },
              { label: 'Generated',  value: generatedCount },
              { label: 'Status',     value: 'Ready' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 14,
                padding: '0.75rem 1.25rem',
                minWidth: 90,
                textAlign: 'center',
              }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 4 }}>
                  {label}
                </p>
                <p style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Two-column body ──────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,340px) minmax(0,1fr)',
          gap: '1.25rem',
          alignItems: 'stretch',   /* equal height */
        }}>

          {/* Create workspace card */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 20,
              padding: '1.5rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 320,
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Create Workspace</h2>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 4, marginBottom: 20 }}>
              Start a new study area for a course, project, or chapter.
            </p>

            <div className="form-group" style={{ flex: 1 }}>
              <label htmlFor="workspace-name" className="form-label">Workspace Name</label>
              <input
                id="workspace-name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isCreating) createNewWorkspace(); }}
                placeholder="e.g. Biology Midterm Revision"
                disabled={isCreating}
              />
              <p className="form-help">Tip: choose a name you can recognise quickly in the sidebar.</p>
            </div>

            {createError && <p className="form-error" style={{ marginTop: 8 }}>{createError}</p>}
            {wsError    && <p className="form-error" style={{ marginTop: 4 }}>{wsError}</p>}

            <button
              type="button"
              onClick={createNewWorkspace}
              disabled={!newWorkspaceName.trim() || isCreating}
              style={{
                width: '100%', marginTop: 'auto', paddingTop: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '0.7rem 1rem', borderRadius: 999,
                background: (!newWorkspaceName.trim() || isCreating) ? '#eff6ff' : '#2563eb',
                border: '1px solid #d1d5db',
                color: (!newWorkspaceName.trim() || isCreating) ? '#9ca3af' : '#ffffff',
                fontSize: '0.875rem', fontWeight: 700,
                cursor: (!newWorkspaceName.trim() || isCreating) ? 'not-allowed' : 'pointer',
                boxShadow: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {isCreating ? <><FiLoader style={{ animation: 'spin 1s linear infinite' }} />Creating...</> : <><FaPlus size={12} />Create Workspace</>}
            </button>
          </motion.article>

          {/* Existing workspaces card */}
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 20,
              padding: '1.5rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 320,
            }}
          >
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Existing Workspaces</h2>
                <p style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 2 }}>Open or manage previously created workspaces.</p>
              </div>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb',
              }}>
                {workspaces.length} total
              </span>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '27%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Name', 'Language', 'Sources', 'Updated', 'Actions'].map((h) => (
                      <th key={h} style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        color: '#9ca3af',
                        borderBottom: '1px solid #e5e7eb',
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wsLoading && (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                        Loading workspaces...
                      </td>
                    </tr>
                  )}
                  {!wsLoading && workspaces.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <FiFolder />
                          No workspaces yet. Create one on the left.
                        </div>
                      </td>
                    </tr>
                  )}
                  {!wsLoading && workspaces.map((ws, i) => (
                    <tr
                      key={ws._id}
                      style={{
                        borderBottom: i < workspaces.length - 1 ? '1px solid #f3f4f6' : 'none',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Name */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ws.name}
                        </p>
                      </td>
                      {/* Language */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                          {LANGUAGE_MAP[ws.language] || ws.language || 'English'}
                        </span>
                      </td>
                      {/* Sources */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <span style={{
                          display: 'inline-block', minWidth: 28, textAlign: 'center',
                          fontSize: '0.82rem', fontWeight: 700, color: '#2563eb',
                          background: '#eff6ff', borderRadius: 6, padding: '2px 8px',
                        }}>
                          {ws.sources?.length ?? 0}
                        </span>
                      </td>
                      {/* Updated */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
                          {new Date(ws.updatedAt).toLocaleDateString()}
                        </span>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1rem', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/workspace/${ws._id}`)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '0.4rem 0.85rem', borderRadius: 999,
                              background: '#2563eb',
                              border: '1px solid #2563eb',
                              color: '#ffffff', fontSize: '0.78rem', fontWeight: 600,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            Open <FiArrowRight size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteWorkspace(ws._id)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 30, height: 30, borderRadius: 8,
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#dc2626', cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              flexShrink: 0,
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fee2e2'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; }}
                          >
                            <FaTrash size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!wsLoading && workspaces.length > 0 && (
              <div style={{
                marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
                padding: '0.65rem 0.9rem', borderRadius: 10,
                background: '#f9fafb', border: '1px solid #e5e7eb',
                fontSize: '0.8rem', color: '#6b7280',
              }}>
                <FiLayers size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
                Tip: open a workspace and use the sidebar quick actions to upload PDF, add URL, or paste text.
              </div>
            )}
          </motion.article>
        </div>
      </div>
    </section>
  );
};

export default WelcomeDashboard;
