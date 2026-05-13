"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const workspaceController_1 = __importDefault(require("../controllers/workspaceController"));
const jwtAuth_1 = __importDefault(require("../middleware/jwtAuth"));
const router = (0, express_1.Router)();
// Configure multer for file uploads (memory storage for S3)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
});
// All routes require authentication
router.use(jwtAuth_1.default);
// ============================================================================
// Workspace CRUD
// ============================================================================
// Create workspace
router.post('/', workspaceController_1.default.create);
// List user's workspaces
router.get('/', workspaceController_1.default.list);
// Get workspace by ID
router.get('/:id', workspaceController_1.default.getById);
// Update workspace
router.put('/:id', workspaceController_1.default.update);
// Delete workspace
router.delete('/:id', workspaceController_1.default.delete);
// ============================================================================
// Source Management
// ============================================================================
// Add PDF source
router.post('/:id/sources/pdf', upload.single('file'), workspaceController_1.default.addPdfSource);
// Add text source
router.post('/:id/sources/text', workspaceController_1.default.addTextSource);
// Add URL source
router.post('/:id/sources/url', workspaceController_1.default.addUrlSource);
// Remove source
router.delete('/:id/sources/:sourceId', workspaceController_1.default.removeSource);
// Get signed URL for source
router.get('/:id/sources/:sourceId/url', workspaceController_1.default.getSourceUrl);
// ============================================================================
// Content Generation
// ============================================================================
// Update generated content
router.patch('/:id/generated-content', workspaceController_1.default.updateGeneratedContent);
exports.default = router;
//# sourceMappingURL=workspaceRoutes.js.map