import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { workspaceService } from '../services/workspaceService';
import { masterService } from '../services/masterService';
import type { Workspace } from '../types';

/**
 * Custom hook for managing workspaces and sources
 */
export function useWorkspace(workspaceId?: string) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to extract error message from API errors
  const getErrorMessage = (err: unknown, defaultMsg: string): string => {
    const axiosError = err as { 
      response?: { data?: { detail?: string; error?: string; message?: string }; status?: number }; 
      message?: string;
      code?: string;
    };
    
    // Check for network errors first (server down, no internet, etc.)
    if (axiosError.code === 'ERR_NETWORK' || axiosError.message?.includes('Network Error')) {
      return 'Unable to connect to server. Please check your connection.';
    }
    if (axiosError.code === 'ECONNREFUSED' || axiosError.message?.includes('ECONNREFUSED')) {
      return 'Connection refused. Server appears to be offline.';
    }
    if (axiosError.code === 'ETIMEDOUT' || axiosError.message?.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    return axiosError.response?.data?.detail 
      || axiosError.response?.data?.error 
      || axiosError.response?.data?.message 
      || (axiosError.message && axiosError.message !== 'Network Error' ? axiosError.message : null)
      || defaultMsg;
  };

  // Clear error state
  const clearError = useCallback(() => setError(null), []);

  // Load all workspaces
  const loadWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      const data = await workspaceService.getWorkspaces();
      setWorkspaces(data);
    } catch (err: unknown) {
      console.error('Failed to load workspaces:', err);
      const errorMsg = getErrorMessage(err, 'Failed to load workspaces');
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load single workspace
  const loadWorkspace = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const data = await workspaceService.getWorkspace(id);
      setWorkspace(data);
      return data;
    } catch (err: unknown) {
      console.error('Failed to load workspace:', err);
      const errorMsg = getErrorMessage(err, 'Failed to load workspace');
      setError(errorMsg);
      message.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create workspace
  const createWorkspace = useCallback(async (name: string, description?: string) => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const newWorkspace = await workspaceService.createWorkspace(name, description);
      setWorkspaces(prev => [newWorkspace, ...prev]);
      setWorkspace(newWorkspace);
      message.success('Workspace created!');
      return newWorkspace;
    } catch (err: unknown) {
      console.error('Failed to create workspace:', err);
      const errorMsg = getErrorMessage(err, 'Failed to create workspace');
      setError(errorMsg);
      message.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete workspace
  const deleteWorkspace = useCallback(async (id: string) => {
    try {
      await workspaceService.deleteWorkspace(id);
      setWorkspaces(prev => prev.filter(w => w._id !== id));
      if (workspace?._id === id) {
        setWorkspace(null);
      }
      message.success('Workspace deleted');
    } catch (err: unknown) {
      console.error('Failed to delete workspace:', err);
      const errorMsg = getErrorMessage(err, 'Failed to delete workspace');
      setError(errorMsg);
      message.error(errorMsg);
    }
  }, [workspace]);

  // Upload PDF
  const uploadPdf = useCallback(async (file: File) => {
    if (!workspace) {
      message.error('No workspace selected');
      return null;
    }
    try {
      const source = await workspaceService.uploadPdf(workspace._id, file);
      setWorkspace(prev => prev ? {
        ...prev,
        sources: [...prev.sources, source]
      } : null);
      message.success('PDF uploaded!');
      return source;
    } catch (err: unknown) {
      console.error('Failed to upload PDF:', err);
      const errorMsg = getErrorMessage(err, 'Failed to upload PDF');
      setError(errorMsg);
      message.error(errorMsg);
      return null;
    }
  }, [workspace]);

  // Add text
  const addText = useCallback(async (title: string, content: string) => {
    if (!workspace) {
      message.error('No workspace selected');
      return null;
    }
    try {
      const source = await workspaceService.addText(workspace._id, title, content);
      setWorkspace(prev => prev ? {
        ...prev,
        sources: [...prev.sources, source]
      } : null);
      message.success('Text added!');
      return source;
    } catch (err: unknown) {
      console.error('Failed to add text:', err);
      const errorMsg = getErrorMessage(err, 'Failed to add text');
      setError(errorMsg);
      message.error(errorMsg);
      return null;
    }
  }, [workspace]);

  // Add URL
  const addUrl = useCallback(async (url: string, name?: string) => {
    if (!workspace) {
      message.error('No workspace selected');
      return null;
    }
    
    // Basic URL validation
    try {
      const urlObj = new URL(url);
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        const errorMsg = 'Invalid URL: Only HTTP and HTTPS URLs are supported';
        setError(errorMsg);
        message.error(errorMsg);
        return null;
      }
    } catch {
      const errorMsg = 'Invalid URL format. Please enter a valid URL starting with http:// or https://';
      setError(errorMsg);
      message.error(errorMsg);
      return null;
    }
    
    try {
      const source = await workspaceService.addUrl(workspace._id, url, name);
      setWorkspace(prev => prev ? {
        ...prev,
        sources: [...prev.sources, source]
      } : null);
      message.success('URL added!');
      return source;
    } catch (err: unknown) {
      console.error('Failed to add URL:', err);
      // Extract detailed error message
      const axiosError = err as { response?: { data?: { error?: string; message?: string }; status?: number }; message?: string; code?: string };
      
      let errorMsg = 'Failed to add URL';
      
      // Check for network errors first
      if (axiosError.code === 'ERR_NETWORK' || axiosError.message?.includes('Network Error')) {
        errorMsg = 'Unable to connect to server. Please check your connection.';
      } else if (axiosError.response?.status === 400) {
        errorMsg = `Invalid URL: ${axiosError.response?.data?.error || 'Bad request'}`;
      } else if (axiosError.response?.status === 403) {
        errorMsg = 'URL access denied. This website may block scraping.';
      } else if (axiosError.response?.status === 404) {
        errorMsg = 'URL not found. Please check the link.';
      } else {
        errorMsg = axiosError.response?.data?.error 
          || axiosError.response?.data?.message 
          || axiosError.message 
          || 'Failed to add URL';
      }
      
      setError(errorMsg);
      message.error(errorMsg);
      return null;
    }
  }, [workspace]);

  // Remove source
  const removeSource = useCallback(async (sourceId: string) => {
    if (!workspace) return;
    try {
      await workspaceService.removeSource(workspace._id, sourceId);
      setWorkspace(prev => prev ? {
        ...prev,
        sources: prev.sources.filter(s => s._id !== sourceId)
      } : null);
      message.success('Source removed');
    } catch (err: unknown) {
      console.error('Failed to remove source:', err);
      const errorMsg = getErrorMessage(err, 'Failed to remove source');
      setError(errorMsg);
      message.error(errorMsg);
    }
  }, [workspace]);

  // Update workspace
  const updateWorkspace = useCallback(async (data: { name?: string; description?: string; language?: string }, silent = false) => {
    if (!workspace) return null;
    try {
      if (!silent) setLoading(true);
      const updated = await workspaceService.updateWorkspace(workspace._id, data);
      
      // Deep-ish merge to preserve populated sources if the background update returns IDs
      setWorkspace(prev => {
        if (!prev) return updated;
        
        // If the backend returned raw IDs for sources but we have objects, keep the objects
        const mergedSources = (updated.sources && updated.sources.length > 0 && typeof updated.sources[0] === 'string')
          ? prev.sources
          : (updated.sources || prev.sources);

        return {
          ...prev,
          ...updated,
          sources: mergedSources
        };
      });

      setWorkspaces(prev => prev.map(w => w._id === updated._id ? { ...w, ...updated } : w));
      
      return updated;
    } catch (err: unknown) {
      console.error('Failed to update workspace:', err);
      if (!silent) {
        const errorMsg = getErrorMessage(err, 'Failed to update workspace');
        setError(errorMsg);
        message.error(errorMsg);
      }
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [workspace]);

  // Get signed URL for source
  const getSourceUrl = useCallback(async (sourceId: string) => {
    if (!workspace) return null;
    try {
      const result = await workspaceService.getSourceUrl(workspace._id, sourceId);
      return result.url;
    } catch (err: unknown) {
      console.error('Failed to get source URL:', err);
      const errorMsg = getErrorMessage(err, 'Failed to get source URL');
      setError(errorMsg);
      message.error(errorMsg);
      return null;
    }
  }, [workspace]);

  // Generate content
  const generateContent = useCallback(async () => {
    if (!workspace) {
      message.error('No workspace selected');
      return null;
    }
    if (workspace.sources.length === 0) {
      message.warning('Add some content sources first');
      return null;
    }
    try {
      setGenerating(true);
      message.loading('AI is processing your workspace directly on FastAPI...', 0);
      
      // Prepare sources for FastAPI
      // FastAPI expects: { id: string, type: "pdf"|"url"|"text", name: string, url?: string, content?: string }
      // IMPORTANT: Prefer signed URLs from the Node backend.
      // Passing raw `s3Key` requires the FastAPI service to have AWS creds/bucket access,
      // which often isn't true in dev or hosted environments and leads to "no content extracted".
      const sourcesForAI = await Promise.all(workspace.sources.map(async (s) => {
        let resolvedUrl = s.sourceUrl || s.s3Key;

        // For stored files (pdf/text), ask backend for a signed URL when possible.
        if ((s.type === 'pdf' || s.type === 'text') && s._id) {
          try {
            const result = await workspaceService.getSourceUrl(workspace._id, s._id);
            if (result?.url) resolvedUrl = result.url;
          } catch (e) {
            // Fall back to existing fields; FastAPI may still handle http(s) URLs.
            console.warn('[Workspace] Failed to resolve signed URL for source', s._id, e);
          }
        }

        return {
          id: s._id,
          type: s.type,
          name: s.name,
          url: resolvedUrl,
          // For text sources, also send the content directly if available
          content: s.content || undefined,
        };
      }));

      // Call FastAPI directly
      const aiResults = await workspaceService.processWorkspaceDirect({
        workspaceId: workspace._id,
        sources: sourcesForAI,
        language: workspace.language || 'en',
        // provider: 'gemini', // Future: allow user to select
        // model: 'gemini-2.0-flash'
      });

      // Save the generated results back to Node.js for persistence
      const updatedWorkspace = await workspaceService.updateGeneratedContent(workspace._id, aiResults);
      
      // Update heatmap to track this generation
      try {
        // Use local date format (YYYY-MM-DD) to ensure correct date tracking
        const today = new Date();
        const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        console.log('[Heatmap] Attempting to update heatmap for date:', localDate);
        await masterService.updateHeatMap({ date: localDate });
        console.log('[Heatmap] Heatmap successfully updated on server');
      } catch (e) {
        console.error('[Heatmap] API call failed:', e);
      }
      
      setWorkspace(updatedWorkspace);
      message.destroy();
      message.success('Content generated and saved!');
      return updatedWorkspace;
    } catch (err: unknown) {
      console.error('Failed to generate content:', err);
      message.destroy();
      
      // Extract detailed error message for user
      const axiosError = err as { 
        response?: { data?: { detail?: string; error?: string; message?: string }; status?: number }; 
        message?: string;
        code?: string;
      };
      
      let errorMsg = 'Failed to generate content';
      
      // Check for network errors first (server down, no internet, etc.)
      if (axiosError.code === 'ERR_NETWORK' || axiosError.message?.includes('Network Error')) {
        errorMsg = 'Unable to connect to server. Please check if the AI service is running.';
      } else if (axiosError.code === 'ECONNREFUSED' || axiosError.message?.includes('ECONNREFUSED')) {
        errorMsg = 'Connection refused. The AI server appears to be offline.';
      } else if (axiosError.code === 'ETIMEDOUT' || axiosError.message?.includes('timeout')) {
        errorMsg = 'Request timed out. Please try again.';
      } else if (
        axiosError.response?.status === 402
        || axiosError.response?.data?.detail?.toLowerCase().includes('payment required')
      ) {
        errorMsg = 'DeepInfra billing/quota issue (402). Add credits or switch AI provider to Gemini/OpenAI/Ollama.';
      } else if (axiosError.response?.status === 403) {
        errorMsg = 'AI service access denied. Please check your API key configuration.';
      } else if (axiosError.response?.status === 429) {
        errorMsg = 'Rate limit exceeded. Please try again later.';
      } else if (axiosError.response?.status === 500) {
        errorMsg = 'Server error. Please try again later.';
      } else if (axiosError.response?.status === 502 || axiosError.response?.status === 503) {
        errorMsg = 'AI service is temporarily unavailable. Please try again later.';
      } else if (axiosError.response?.data?.detail) {
        errorMsg = axiosError.response.data.detail;
      } else if (axiosError.response?.data?.error) {
        errorMsg = axiosError.response.data.error;
      } else if (axiosError.response?.data?.message) {
        errorMsg = axiosError.response.data.message;
      } else if (axiosError.message && axiosError.message !== 'Network Error') {
        errorMsg = axiosError.message;
      }
      
      // Set error state so ErrorBanner shows in UI
      setError(errorMsg);
      message.error(errorMsg, 5); // Also show toast for immediate feedback
      return null;
    } finally {
      setGenerating(false);
    }
  }, [workspace]);

  // Auto-load workspaces on mount
  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // Auto-load workspace if ID provided
  useEffect(() => {
    if (workspaceId) {
      loadWorkspace(workspaceId);
    }
  }, [workspaceId, loadWorkspace]);

  return {
    // State
    workspace,
    workspaces,
    loading,
    generating,
    error,
    sources: workspace?.sources || [],
    generatedContent: workspace?.generatedContent,
    
    // Actions
    loadWorkspaces,
    loadWorkspace,
    createWorkspace,
    deleteWorkspace,
    uploadPdf,
    addText,
    addUrl,
    removeSource,
    updateWorkspace,
    getSourceUrl,
    generateContent,
    setWorkspace,
    clearError,
  };
}

export default useWorkspace;
