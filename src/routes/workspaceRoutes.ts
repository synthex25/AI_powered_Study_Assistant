import { Router, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import workspaceController from '../controllers/workspaceController';
import verifyToken from '../middleware/jwtAuth';

const router = Router();

// Configure multer for file uploads (memory storage for S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// All routes require authentication
router.use(verifyToken);

// ============================================================================
// Workspace CRUD
// ============================================================================

// Create workspace
router.post('/', workspaceController.create);

// List user's workspaces
router.get('/', workspaceController.list);

// Get workspace by ID
router.get('/:id', workspaceController.getById);

// Update workspace
router.put('/:id', workspaceController.update);

// Delete workspace
router.delete('/:id', workspaceController.delete);

// ============================================================================
// Source Management
// ============================================================================

// Add PDF source
router.post('/:id/sources/pdf', upload.single('file'), workspaceController.addPdfSource);

// Add text source
router.post('/:id/sources/text', workspaceController.addTextSource);

// Add URL source
router.post('/:id/sources/url', workspaceController.addUrlSource);

// Remove source
router.delete('/:id/sources/:sourceId', workspaceController.removeSource);

// Get signed URL for source
router.get('/:id/sources/:sourceId/url', workspaceController.getSourceUrl);

// ============================================================================
// Content Generation
// ============================================================================

// Update generated content
router.patch('/:id/generated-content', workspaceController.updateGeneratedContent);

export default router;
