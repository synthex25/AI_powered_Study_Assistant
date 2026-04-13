import axiosInstance, { fastapiInstance } from '../config/axios';
import { Workspace, Source } from '../types';

/**
 * Workspace API Service
 * Handles all workspace and source operations
 */
export const workspaceService = {
  // ============================================================================
  // Workspace CRUD
  // ============================================================================

  /**
   * Create a new workspace
   */
  async createWorkspace(name: string, description?: string): Promise<Workspace> {
    const response = await axiosInstance.post('/workspaces', { name, description });
    return response.data;
  },

  /**
   * Get all workspaces for the current user
   */
  async getWorkspaces(): Promise<Workspace[]> {
    const response = await axiosInstance.get('/workspaces');
    return response.data;
  },

  /**
   * Get a single workspace by ID
   */
  async getWorkspace(id: string): Promise<Workspace> {
    const response = await axiosInstance.get(`/workspaces/${id}`);
    return response.data;
  },

  /**
   * Update workspace
   */
  async updateWorkspace(id: string, data: { name?: string; description?: string; language?: string }): Promise<Workspace> {
    const response = await axiosInstance.put(`/workspaces/${id}`, data);
    return response.data;
  },

  /**
   * Delete workspace
   */
  async deleteWorkspace(id: string): Promise<void> {
    await axiosInstance.delete(`/workspaces/${id}`);
  },

  // ============================================================================
  // Source Management
  // ============================================================================

  /**
   * Upload a PDF to workspace
   */
  async uploadPdf(workspaceId: string, file: File): Promise<Source> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axiosInstance.post(
      `/workspaces/${workspaceId}/sources/pdf`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  /**
   * Add text content to workspace
   */
  async addText(workspaceId: string, title: string, content: string): Promise<Source> {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/sources/text`, {
      title,
      content,
    });
    return response.data;
  },

  /**
   * Add URL to workspace
   */
  async addUrl(workspaceId: string, url: string, name?: string): Promise<Source> {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/sources/url`, {
      url,
      name: name || url,
    });
    return response.data;
  },

  /**
   * Remove source from workspace
   */
  async removeSource(workspaceId: string, sourceId: string): Promise<void> {
    await axiosInstance.delete(`/workspaces/${workspaceId}/sources/${sourceId}`);
  },

  /**
   * Get signed URL for a source (for viewing PDFs)
   */
  async getSourceUrl(workspaceId: string, sourceId: string): Promise<{ url: string; expiresIn?: number }> {
    const response = await axiosInstance.get(`/workspaces/${workspaceId}/sources/${sourceId}/url`);
    return response.data;
  },

  // ============================================================================
  // Content Generation
  // ============================================================================

  /**
   * Generate content (notes, flashcards, quizzes) for workspace
   */
  async generateContent(workspaceId: string): Promise<Workspace> {
    const response = await axiosInstance.post(`/workspaces/${workspaceId}/generate`);
    return response.data;
  },
  /**
   * Process workspace content DIRECTLY via FastAPI
   */
  async processWorkspaceDirect(data: {
    workspaceId: string;
    sources: any[];
    language?: string;
    provider?: string;
    model?: string;
  }): Promise<any> {
    const response = await fastapiInstance.post('/workspace/process-workspace', data);
    return response.data;
  },

  /**
   * Save generated content back to Node.js backend
   */
  async updateGeneratedContent(workspaceId: string, content: any): Promise<Workspace> {
    const response = await axiosInstance.patch(`/workspaces/${workspaceId}/generated-content`, content);
    return response.data;
  },
};

export default workspaceService;
