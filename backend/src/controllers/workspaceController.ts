import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import Workspace from '../models/Workspace';
import Source, { ISource } from '../models/Source';
import { storageService } from '../services/storageService';
import config from '../config';
import logger from '../utils/logger';

// Extended request with user and file
interface AuthRequest extends Request {
  user?: { userId: string; email: string };
  file?: Express.Multer.File;
}

/**
 * Workspace Controller - Handles all workspace and source operations
 */
export const workspaceController = {
  /**
   * Create a new workspace
   */
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;
      console.log(req.user);
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const workspace = await Workspace.create({
        userId,
        name,
        description,
        sources: [],
        language: 'en',
      });

      logger.info(`Workspace created: ${workspace._id}`);
      res.status(201).json(workspace);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all workspaces for user
   */
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      const workspaces = await Workspace.find({ userId })
        .sort({ updatedAt: -1 })
        .select('-generatedContent') // Exclude large content
        .lean();

      res.json(workspaces);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get single workspace with sources
   */
  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const workspace = await Workspace.findOne({ _id: id, userId })
        .populate('sources')
        .lean();

      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      res.json(workspace);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update workspace
   */
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, language } = req.body;
      const userId = req.user?.userId;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (language !== undefined) updateData.language = language;

      const workspace = await Workspace.findOneAndUpdate(
        { _id: id, userId },
        { $set: updateData },
        { new: true }
      ).populate('sources');

      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      res.json(workspace);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete workspace and all sources
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const workspace = await Workspace.findOne({ _id: id, userId });
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Delete all sources from storage
      const sources = await Source.find({ workspaceId: id });
      for (const source of sources) {
        if (source.s3Key) {
          await storageService.deleteFile(source.s3Key);
        }
      }

      // Delete sources from MongoDB
      await Source.deleteMany({ workspaceId: id });

      // Delete workspace
      await Workspace.deleteOne({ _id: id });

      logger.info(`Workspace deleted: ${id}`);
      res.json({ message: 'Workspace deleted' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Add PDF source to workspace
   */
  async addPdfSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // File size validation - 10MB limit
      const MAX_FILE_SIZE_MB = 10;
      const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
      
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return res.status(400).json({ 
          error: `File size (${fileSizeMB}MB) exceeds the ${MAX_FILE_SIZE_MB}MB limit. Please upload a smaller file.` 
        });
      }

      const workspace = await Workspace.findOne({ _id: id, userId });
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Upload to storage (S3 or local based on config)
      const { key } = await storageService.uploadPDF(id, file.originalname, file.buffer, req.user?.email);

      // Create source record
      const source = await Source.create({
        workspaceId: id,
        type: 'pdf',
        name: file.originalname,
        s3Key: key,
        s3Bucket: config.aws.s3Bucket,
        fileSize: file.size,
      });

      // Add to workspace
      workspace.sources.push(source._id);
      await workspace.save();

      logger.info(`PDF source added: ${source._id}`);
      res.status(201).json(source);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Add text source to workspace
   */
  async addTextSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { title, content } = req.body;
      const userId = req.user?.userId;

      const workspace = await Workspace.findOne({ _id: id, userId });
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Upload to storage (S3 or local based on config)
      const { key } = await storageService.uploadText(id, title, content, req.user?.email);

      // Create source record
      const source = await Source.create({
        workspaceId: id,
        type: 'text',
        name: title,
        s3Key: key,
        s3Bucket: config.aws.s3Bucket,
        fileSize: Buffer.byteLength(content, 'utf-8'),
        extractedTextPreview: content.substring(0, 500),
      });

      // Add to workspace
      workspace.sources.push(source._id);
      await workspace.save();

      logger.info(`Text source added: ${source._id}`);
      res.status(201).json(source);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Add URL source to workspace
   */
  async addUrlSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { url, name } = req.body;
      const userId = req.user?.userId;

      // Validate URL
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL is required' });
      }

      // Validate URL format
      try {
        const urlObj = new URL(url);
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
          return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are supported' });
        }
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }

      const workspace = await Workspace.findOne({ _id: id, userId });
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Create source record (URL content will be fetched during processing)
      const source = await Source.create({
        workspaceId: id,
        type: 'url',
        name: name || url,
        sourceUrl: url,
      });

      // Add to workspace
      workspace.sources.push(source._id);
      await workspace.save();

      logger.info(`URL source added: ${source._id}`);
      res.status(201).json(source);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Remove source from workspace
   */
  async removeSource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id, sourceId } = req.params;
      const userId = req.user?.userId;

      const workspace = await Workspace.findOne({ _id: id, userId });
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      const source = await Source.findOne({ _id: sourceId, workspaceId: id });
      if (!source) {
        return res.status(404).json({ error: 'Source not found' });
      }

      // Delete from S3 if applicable
      // if (source.s3Key) {
      //   await s3Service.deleteFile(source.s3Key);
      // }

      // Remove from workspace
      workspace.sources = workspace.sources.filter(
        (s) => s.toString() !== sourceId
      );
      await workspace.save();

      // Delete source record
      await Source.deleteOne({ _id: sourceId });

      logger.info(`Source removed: ${sourceId}`);
      res.json({ message: 'Source removed' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get signed URL for a source
   */
  async getSourceUrl(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id, sourceId } = req.params;
      const userId = req.user?.userId;

      const workspace = await Workspace.findOne({ _id: id, userId });
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      const source = await Source.findOne({ _id: sourceId, workspaceId: id });
      if (!source) {
        return res.status(404).json({ error: 'Source not found' });
      }

      if (source.type === 'url') {
        return res.json({ url: source.sourceUrl });
      }

      if (!source.s3Key) {
        return res.status(400).json({ error: 'No file associated with source' });
      }

      const signedUrl = await storageService.getSignedReadUrl(source.s3Key);
      res.json({ url: signedUrl, expiresIn: 3600 });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Generate content for workspace (calls FastAPI)
   */
  async generateContent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      const workspace = await Workspace.findOne({ _id: id, userId }).populate('sources');
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      if (workspace.sources.length === 0) {
        return res.status(400).json({ error: 'Workspace has no sources' });
      }

      // Mark as processing
      workspace.isProcessing = true;
      await workspace.save();

      // Prepare sources for AI processing
      const processedSources = await Promise.all(
        (workspace.sources as unknown as ISource[]).map(async (source) => {
          let content: string | null = null;
          let url: string | null = null;

          try {
            if (source.type === 'pdf') {
              // ALWAYS send PDF as Base64 to avoid ephemeral storage issues
              logger.info(`[Workspace] Sending PDF as Base64: ${source.name}`);
              try {
                if (source.s3Key) {
                  const buf = await storageService.getFileBuffer(source.s3Key);
                  content = buf.toString('base64');
                  logger.info(`[Workspace] PDF bytes read: ${buf.length} -> Base64: ${content.length}`);
                }
              } catch (readErr: any) {
                logger.error(`[Workspace] FAILED TO READ PDF: ${source.name} - ${readErr.message}`);
              }
            } else if (source.type === 'text') {
              // Send text content directly
              if (source.s3Key) {
                content = await storageService.getFileContent(source.s3Key);
                logger.info(`[Workspace] Sending text content: ${source.name}`);
              }
            } else if (source.type === 'url') {
              url = source.sourceUrl || null;
              logger.info(`[Workspace] Sending URL source: ${source.name}`);
            }

            // Fallback for non-PDF sources that still need a signed URL
            if (!content && !url && source.s3Key) {
              url = await storageService.getSignedReadUrl(source.s3Key);
            }
          } catch (err) {
            logger.error(`[Workspace] Error preparing source ${source.name}: ${err}`);
          }

          return {
            id: source._id,
            type: source.type,
            name: source.name,
            url,
            content,
          };
        })
      );

      // Verify we have at least some processable content
      const validSources = processedSources.filter(s => s.content || s.url);
      if (validSources.length === 0) {
        workspace.isProcessing = false;
        await workspace.save();
        logger.error(`No valid sources could be prepared for workspace ${id}`);
        return res.status(400).json({ 
          error: 'Unable to process workspace: No valid source content or URLs could be generated.' 
        });
      }

      logger.info(`Processing workspace ${id} with ${validSources.length} source(s)`);
      validSources.forEach(s => {
        logger.info(`  - ${s.type}: ${s.name} (${s.content ? 'Base64' : 'URL'})`);
      });

      // Call FastAPI for processing with authentication
      const token = req.headers.authorization || '';
      const aiUrl = `${config.fastapiUrl}/api/workspace/process-workspace`;
      logger.info(`Calling AI Service at: ${aiUrl}`);
      
      let response;
      try {
        response = await axios.post(
          aiUrl,
          {
            workspaceId: id,
            sources: validSources,
          },
          {
            timeout: 300000, // 5 minute timeout for processing
            headers: {
              'Authorization': token,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (aiErr: any) {
        logger.error(`FASTAPI CALL FAILED: ${aiErr.message}`);
        if (aiErr.code === 'ECONNREFUSED' || aiErr.code === 'ENOTFOUND') {
          throw new Error(`Could not connect to AI service at ${config.fastapiUrl}. If your AI service is running locally, the cloud backend cannot reach it. Please provide a public URL for your AI service.`);
        }
        throw aiErr;
      }


      // Save generated content
      workspace.generatedContent = {
        ...response.data,
        generatedAt: new Date(),
      };
      workspace.isProcessing = false;
      workspace.lastProcessedAt = new Date();
      await workspace.save();

      logger.info(`Content generated for workspace: ${id}`);
      res.json(workspace);
    } catch (error) {
      // Reset processing flag on error
      await Workspace.updateOne(
        { _id: req.params.id },
        { isProcessing: false }
      );
      next(error);
    }
  },

  /**
   * Update generated content for workspace (save results from FastAPI)
   */
  async updateGeneratedContent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;
      const content = req.body;

      const workspace = await Workspace.findOne({ _id: id, userId }).populate('sources');
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Preserve existing keyConcepts if not provided
      const keyConcepts = content.keyConcepts || content.key_concepts || workspace.generatedContent?.keyConcepts;

      workspace.generatedContent = {
        title: content.title || workspace.generatedContent?.title,
        summary: content.summary || workspace.generatedContent?.summary,
        notes: content.notes || workspace.generatedContent?.notes,
        flashcards: content.flashcards || workspace.generatedContent?.flashcards,
        quizzes: content.quizzes || workspace.generatedContent?.quizzes,
        recommendations: content.recommendations || workspace.generatedContent?.recommendations,
        keyConcepts: Array.isArray(keyConcepts) ? keyConcepts : workspace.generatedContent?.keyConcepts,
        generatedAt: new Date(),
      };

      workspace.isProcessing = false;
      workspace.lastProcessedAt = new Date();
      await workspace.save();

      logger.info(`Generated content updated (via direct FastAPI) for workspace: ${id}`);
      res.json(workspace);
    } catch (error) {
      next(error);
    }
  },
};

export default workspaceController;
