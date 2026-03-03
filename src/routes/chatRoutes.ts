import { Router } from 'express';
import verifyToken from '../middleware/jwtAuth';
import {
  getChatSessions,
  getChatSession,
  createChatSession,
  updateChatSession,
  addMessage,
  deleteChatSession,
} from '../controllers/chatController';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// Chat session CRUD
router.get('/', getChatSessions);
router.post('/', createChatSession);
router.get('/:id', getChatSession);
router.put('/:id', updateChatSession);
router.delete('/:id', deleteChatSession);

// Message management
router.post('/:id/messages', addMessage);

export default router;
