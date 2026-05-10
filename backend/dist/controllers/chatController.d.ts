import { Response } from 'express';
import { AuthRequest } from '../types';
/**
 * Get all chat sessions for the authenticated user
 */
export declare const getChatSessions: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get a specific chat session with messages
 */
export declare const getChatSession: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Create a new chat session
 */
export declare const createChatSession: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Update a chat session (title, language)
 */
export declare const updateChatSession: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Add a message to a chat session
 */
export declare const addMessage: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Delete a chat session
 */
export declare const deleteChatSession: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=chatController.d.ts.map