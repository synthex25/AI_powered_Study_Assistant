"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jwtAuth_1 = __importDefault(require("../middleware/jwtAuth"));
const chatController_1 = require("../controllers/chatController");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(jwtAuth_1.default);
// Chat session CRUD
router.get('/', chatController_1.getChatSessions);
router.post('/', chatController_1.createChatSession);
router.get('/:id', chatController_1.getChatSession);
router.put('/:id', chatController_1.updateChatSession);
router.delete('/:id', chatController_1.deleteChatSession);
// Message management
router.post('/:id/messages', chatController_1.addMessage);
exports.default = router;
//# sourceMappingURL=chatRoutes.js.map