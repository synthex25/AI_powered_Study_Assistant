"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteChatSession = exports.addMessage = exports.updateChatSession = exports.createChatSession = exports.getChatSession = exports.getChatSessions = void 0;
const ChatSession_1 = __importDefault(require("../models/ChatSession"));
const apiResponse_1 = require("../utils/apiResponse");
const AppError_1 = require("../errors/AppError");
// ============================================================================
// Controller Functions
// ============================================================================
/**
 * Get all chat sessions for the authenticated user
 */
const getChatSessions = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            throw new AppError_1.AppError('User not authenticated', 401);
        const sessions = await ChatSession_1.default.find({ userId })
            .select('_id title documentIds outputLanguage createdAt updatedAt')
            .sort({ updatedAt: -1 })
            .lean();
        (0, apiResponse_1.sendSuccess)(res, sessions, 'Chat sessions retrieved');
    }
    catch (error) {
        (0, apiResponse_1.sendError)(res, error.message);
    }
};
exports.getChatSessions = getChatSessions;
/**
 * Get a specific chat session with messages
 */
const getChatSession = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        if (!userId)
            throw new AppError_1.AppError('User not authenticated', 401);
        const session = await ChatSession_1.default.findOne({ _id: id, userId }).lean();
        if (!session)
            throw new AppError_1.NotFoundError('Chat session not found');
        (0, apiResponse_1.sendSuccess)(res, session, 'Chat session retrieved');
    }
    catch (error) {
        (0, apiResponse_1.sendError)(res, error.message);
    }
};
exports.getChatSession = getChatSession;
/**
 * Create a new chat session
 */
const createChatSession = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            throw new AppError_1.AppError('User not authenticated', 401);
        const { title, documentIds, outputLanguage } = req.body;
        const session = await ChatSession_1.default.create({
            userId,
            title: title || 'New Chat',
            documentIds: documentIds || [],
            outputLanguage: outputLanguage || 'en',
            messages: [],
        });
        (0, apiResponse_1.sendSuccess)(res, {
            _id: session._id,
            title: session.title,
            documentIds: session.documentIds,
            outputLanguage: session.outputLanguage,
            createdAt: session.createdAt,
        }, 'Chat session created', 201);
    }
    catch (error) {
        (0, apiResponse_1.sendError)(res, error.message);
    }
};
exports.createChatSession = createChatSession;
/**
 * Update a chat session (title, language)
 */
const updateChatSession = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        const { title, outputLanguage } = req.body;
        if (!userId)
            throw new AppError_1.AppError('User not authenticated', 401);
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (outputLanguage !== undefined)
            updateData.outputLanguage = outputLanguage;
        const session = await ChatSession_1.default.findOneAndUpdate({ _id: id, userId }, { $set: updateData }, { new: true }).select('_id title outputLanguage updatedAt');
        if (!session)
            throw new AppError_1.NotFoundError('Chat session not found');
        (0, apiResponse_1.sendSuccess)(res, session, 'Chat session updated');
    }
    catch (error) {
        (0, apiResponse_1.sendError)(res, error.message);
    }
};
exports.updateChatSession = updateChatSession;
/**
 * Add a message to a chat session
 */
const addMessage = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        const { role, content } = req.body;
        if (!userId)
            throw new AppError_1.AppError('User not authenticated', 401);
        if (!role || !content)
            throw new AppError_1.AppError('Role and content are required', 400);
        const session = await ChatSession_1.default.findOneAndUpdate({ _id: id, userId }, {
            $push: {
                messages: { role, content, timestamp: new Date() }
            }
        }, { new: true }).select('_id messages');
        if (!session)
            throw new AppError_1.NotFoundError('Chat session not found');
        (0, apiResponse_1.sendSuccess)(res, {
            messageCount: session.messages.length,
            lastMessage: session.messages[session.messages.length - 1]
        }, 'Message added');
    }
    catch (error) {
        (0, apiResponse_1.sendError)(res, error.message);
    }
};
exports.addMessage = addMessage;
/**
 * Delete a chat session
 */
const deleteChatSession = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        if (!userId)
            throw new AppError_1.AppError('User not authenticated', 401);
        const result = await ChatSession_1.default.findOneAndDelete({ _id: id, userId });
        if (!result)
            throw new AppError_1.NotFoundError('Chat session not found');
        (0, apiResponse_1.sendSuccess)(res, null, 'Chat session deleted');
    }
    catch (error) {
        (0, apiResponse_1.sendError)(res, error.message);
    }
};
exports.deleteChatSession = deleteChatSession;
//# sourceMappingURL=chatController.js.map