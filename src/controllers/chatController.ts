import { Response } from 'express';
import ChatSession from '../models/ChatSession';
import { AuthRequest, CreateChatSessionBody, UpdateChatSessionBody, AddMessageBody } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { AppError, NotFoundError } from '../errors/AppError';

// ============================================================================
// Controller Functions
// ============================================================================

/**
 * Get all chat sessions for the authenticated user
 */
export const getChatSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('User not authenticated', 401);

    const sessions = await ChatSession.find({ userId })
      .select('_id title documentIds outputLanguage createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    sendSuccess(res, sessions, 'Chat sessions retrieved');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

/**
 * Get a specific chat session with messages
 */
export const getChatSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) throw new AppError('User not authenticated', 401);

    const session = await ChatSession.findOne({ _id: id, userId }).lean();
    if (!session) throw new NotFoundError('Chat session not found');

    sendSuccess(res, session, 'Chat session retrieved');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

/**
 * Create a new chat session
 */
export const createChatSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError('User not authenticated', 401);

    const { title, documentIds, outputLanguage }: CreateChatSessionBody = req.body;

    const session = await ChatSession.create({
      userId,
      title: title || 'New Chat',
      documentIds: documentIds || [],
      outputLanguage: outputLanguage || 'en',
      messages: [],
    });

    sendSuccess(res, {
      _id: session._id,
      title: session.title,
      documentIds: session.documentIds,
      outputLanguage: session.outputLanguage,
      createdAt: session.createdAt,
    }, 'Chat session created', 201);
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

/**
 * Update a chat session (title, language)
 */
export const updateChatSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { title, outputLanguage }: UpdateChatSessionBody = req.body;

    if (!userId) throw new AppError('User not authenticated', 401);

    const updateData: Partial<UpdateChatSessionBody> = {};
    if (title !== undefined) updateData.title = title;
    if (outputLanguage !== undefined) updateData.outputLanguage = outputLanguage;

    const session = await ChatSession.findOneAndUpdate(
      { _id: id, userId },
      { $set: updateData },
      { new: true }
    ).select('_id title outputLanguage updatedAt');

    if (!session) throw new NotFoundError('Chat session not found');

    sendSuccess(res, session, 'Chat session updated');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

/**
 * Add a message to a chat session
 */
export const addMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { role, content }: AddMessageBody = req.body;

    if (!userId) throw new AppError('User not authenticated', 401);
    if (!role || !content) throw new AppError('Role and content are required', 400);

    const session = await ChatSession.findOneAndUpdate(
      { _id: id, userId },
      { 
        $push: { 
          messages: { role, content, timestamp: new Date() } 
        } 
      },
      { new: true }
    ).select('_id messages');

    if (!session) throw new NotFoundError('Chat session not found');

    sendSuccess(res, { 
      messageCount: session.messages.length,
      lastMessage: session.messages[session.messages.length - 1]
    }, 'Message added');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};

/**
 * Delete a chat session
 */
export const deleteChatSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) throw new AppError('User not authenticated', 401);

    const result = await ChatSession.findOneAndDelete({ _id: id, userId });
    if (!result) throw new NotFoundError('Chat session not found');

    sendSuccess(res, null, 'Chat session deleted');
  } catch (error) {
    sendError(res, (error as Error).message);
  }
};
