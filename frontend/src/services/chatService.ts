import api from '../config/axios';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  _id: string;
  title: string;
  documentIds: string[];
  outputLanguage: string;
  messages?: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionParams {
  title?: string;
  documentIds?: string[];
  outputLanguage?: string;
}

export interface UpdateSessionParams {
  title?: string;
  outputLanguage?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ============================================================================
// Service
// ============================================================================

/**
 * Chat session service for managing AI conversation history
 */
export const chatService = {
  /**
   * Get all chat sessions for the current user
   */
  getSessions: async (): Promise<ChatSession[]> => {
    const response = await api.get<ApiResponse<ChatSession[]>>('/chat');
    return response.data.data;
  },

  /**
   * Get a specific session with all messages
   */
  getSession: async (sessionId: string): Promise<ChatSession> => {
    const response = await api.get<ApiResponse<ChatSession>>(`/chat/${sessionId}`);
    return response.data.data;
  },

  /**
   * Create a new chat session
   */
  createSession: async (params?: CreateSessionParams): Promise<ChatSession> => {
    const response = await api.post<ApiResponse<ChatSession>>('/chat', params || {});
    return response.data.data;
  },

  /**
   * Update session metadata (title, language)
   */
  updateSession: async (sessionId: string, params: UpdateSessionParams): Promise<ChatSession> => {
    const response = await api.put<ApiResponse<ChatSession>>(`/chat/${sessionId}`, params);
    return response.data.data;
  },

  /**
   * Add a message to a session
   */
  addMessage: async (
    sessionId: string, 
    role: 'user' | 'assistant', 
    content: string
  ): Promise<{ messageCount: number; lastMessage: ChatMessage }> => {
    const response = await api.post<ApiResponse<{ messageCount: number; lastMessage: ChatMessage }>>(
      `/chat/${sessionId}/messages`,
      { role, content }
    );
    return response.data.data;
  },

  /**
   * Delete a chat session
   */
  deleteSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/chat/${sessionId}`);
  },
};
