"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspaceController = void 0;
const axios_1 = __importDefault(require("axios"));
const Workspace_1 = __importDefault(require("../models/Workspace"));
const Source_1 = __importDefault(require("../models/Source"));
const storageService_1 = require("../services/storageService");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Workspace Controller - Handles all workspace and source operations
 */
exports.workspaceController = {
    /**
     * Create a new workspace
     */
    async create(req, res, next) {
        try {
            const { name, description } = req.body;
            console.log(req.user);
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const workspace = await Workspace_1.default.create({
                userId,
                name,
                description,
                sources: [],
                language: 'en',
            });
            logger_1.default.info(`Workspace created: ${workspace._id}`);
            res.status(201).json(workspace);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Get all workspaces for user
     */
    async list(req, res, next) {
        try {
            const userId = req.user?.userId;
            const workspaces = await Workspace_1.default.find({ userId })
                .sort({ updatedAt: -1 })
                .select('-generatedContent') // Exclude large content
                .lean();
            res.json(workspaces);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Get single workspace with sources
     */
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            const workspace = await Workspace_1.default.findOne({ _id: id, userId })
                .populate('sources')
                .lean();
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }
            res.json(workspace);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Update workspace
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { name, description, language } = req.body;
            const userId = req.user?.userId;
            const updateData = {};
            if (name !== undefined)
                updateData.name = name;
            if (description !== undefined)
                updateData.description = description;
            if (language !== undefined)
                updateData.language = language;
            const workspace = await Workspace_1.default.findOneAndUpdate({ _id: id, userId }, { $set: updateData }, { new: true }).populate('sources');
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }
            res.json(workspace);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Delete workspace and all sources
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            const workspace = await Workspace_1.default.findOne({ _id: id, userId });
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }
            // Delete all sources from storage
            const sources = await Source_1.default.find({ workspaceId: id });
            for (const source of sources) {
                if (source.s3Key) {
                    await storageService_1.storageService.deleteFile(source.s3Key);
                }
            }
            // Delete sources from MongoDB
            await Source_1.default.deleteMany({ workspaceId: id });
            // Delete workspace
            await Workspace_1.default.deleteOne({ _id: id });
            logger_1.default.info(`Workspace deleted: ${id}`);
            res.json({ message: 'Workspace deleted' });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Add PDF source to workspace
     */
    async addPdfSource(req, res, next) {
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
            const workspace = await Workspace_1.default.findOne({ _id: id, userId });
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }
            // Upload to storage (S3 or local based on config)
            const { key } = await storageService_1.storageService.uploadPDF(id, file.originalname, file.buffer, req.user?.email);
            // Create source record
            const source = await Source_1.default.create({
                workspaceId: id,
                type: 'pdf',
                name: file.originalname,
                s3Key: key,
                s3Bucket: config_1.default.aws.s3Bucket,
                fileSize: file.size,
            });
            // Add to workspace
            workspace.sources.push(source._id);
            await workspace.save();
            logger_1.default.info(`PDF source added: ${source._id}`);
            res.status(201).json(source);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Add text source to workspace
     */
    async addTextSource(req, res, next) {
        try {
            const { id } = req.params;
            const { title, content } = req.body;
            const userId = req.user?.userId;
            const workspace = await Workspace_1.default.findOne({ _id: id, userId });
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }
            // Upload to storage (S3 or local based on config)
            const { key } = await storageService_1.storageService.uploadText(id, title, content, req.user?.email);
            // Create source record
            const source = await Source_1.default.create({
                workspaceId: id,
                type: 'text',
                name: title,
                s3Key: key,
                s3Bucket: config_1.default.aws.s3Bucket,
                fileSize: Buffer.byteLength(content, 'utf-8'),
                extractedTextPreview: content.substring(0, 500),
            });
            // Add to workspace
            workspace.sources.push(source._id);
            await workspace.save();
            logger_1.default.info(`Text source added: ${source._id}`);
            res.status(201).json(source);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Add URL source to workspace
     */
    async addUrlSource(req, res, next) {
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
            }
            catch {
                return res.status(400).json({ error: 'Invalid URL format' });
            }
            const workspace = await Workspace_1.default.findOne({ _id: id, userId });
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }
            // Create source record (URL content will be fetched during processing)
            const source = await Source_1.default.create({
                workspaceId: id,
                type: 'url',
                name: name || url,
                sourceUrl: url,
            });
            // Add to workspace
            workspace.sources.push(source._id);
            await workspace.save();
            logger_1.default.info(`URL source added: ${source._id}`);
            res.status(201).json(source);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Remove source from workspace
     */
    async removeSource(req, res, next) {
        try {
            const { id, sourceId } = req.params;
            const userId = req.user?.userId;
            const workspace = await Workspace_1.default.findOne({ _id: id, userId });
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }
            const source = await Source_1.default.findOne({ _id: sourceId, workspaceId: id });
            if (!source) {
                return res.status(404).json({ error: 'Source not found' });
            }
            // Delete from S3 if applicable
            // if (source.s3Key) {
            //   await s3Service.deleteFile(source.s3Key);
            // }
            // Remove from workspace
            workspace.sources = workspace.sources.filter((s) => s.toString() !== sourceId);
            await workspace.save();
            // Delete source record
            await Source_1.default.deleteOne({ _id: sourceId });
            logger_1.default.info(`Source removed: ${sourceId}`);
            res.json({ message: 'Source removed' });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Get signed URL for a source
     */
    async getSourceUrl(req, res, next) {
        try {
            const { id, sourceId } = req.params;
            const userId = req.user?.userId;
            const workspace = await Workspace_1.default.findOne({ _id: id, userId });
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }
            const source = await Source_1.default.findOne({ _id: sourceId, workspaceId: id });
            if (!source) {
                return res.status(404).json({ error: 'Source not found' });
            }
            if (source.type === 'url') {
                return res.json({ url: source.sourceUrl });
            }
            if (!source.s3Key) {
                return res.status(400).json({ error: 'No file associated with source' });
            }
            const signedUrl = await storageService_1.storageService.getSignedReadUrl(source.s3Key);
            res.json({ url: signedUrl, expiresIn: 3600 });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * Generate content for workspace (calls FastAPI)
     */
    async generateContent(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            const workspace = await Workspace_1.default.findOne({ _id: id, userId }).populate('sources');
            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found' });
            }
            if (workspace.sources.length === 0) {
                return res.status(400).json({ error: 'Workspace has no sources' });
            }
            // Mark as processing
            workspace.isProcessing = true;
            await workspace.save();
            // Prepare sources with signed URLs
            const sourcesWithUrls = await Promise.all(workspace.sources.map(async (source) => {
                let signedUrl = null;
                let content = null;
                try {
                    if (source.s3Key) {
                        signedUrl = await storageService_1.storageService.getSignedReadUrl(source.s3Key);
                        logger_1.default.info(`Generated signed URL for ${source.type}: ${source.name} (${source.s3Key})`);
                        // If we're using local storage, include the file contents directly
                        // so the FastAPI service can read the file even if S3 is not configured.
                        if (config_1.default.storageProvider === 'local') {
                            try {
                                if (source.type === 'text') {
                                    const txt = await storageService_1.storageService.getFileContent(source.s3Key);
                                    content = txt;
                                }
                                else if (source.type === 'pdf') {
                                    const buf = await storageService_1.storageService.getFileBuffer(source.s3Key);
                                    content = buf.toString('base64');
                                }
                            }
                            catch (readErr) {
                                logger_1.default.warn(`Failed to read local file for ${source.name}: ${readErr}`);
                            }
                        }
                    }
                }
                catch (urlError) {
                    logger_1.default.error(`Failed to generate signed URL for ${source.name}: ${urlError}`);
                }
                return {
                    id: source._id,
                    type: source.type,
                    name: source.name,
                    url: source.type === 'url' ? source.sourceUrl : signedUrl,
                    content,
                };
            }));
            // Verify we have at least some URLs
            const sourcesWithValidUrls = sourcesWithUrls.filter(s => s.url);
            if (sourcesWithValidUrls.length === 0) {
                workspace.isProcessing = false;
                await workspace.save();
                logger_1.default.error(`No valid source URLs could be generated for workspace ${id}`);
                return res.status(400).json({
                    error: 'Unable to process workspace: No valid source URLs could be generated. Please ensure S3 credentials are configured correctly.'
                });
            }
            logger_1.default.info(`Processing workspace ${id} with ${sourcesWithValidUrls.length} source(s)`);
            sourcesWithValidUrls.forEach(s => {
                logger_1.default.info(`  - ${s.type}: ${s.name}`);
            });
            // Call FastAPI for processing with authentication
            const token = req.headers.authorization || '';
            logger_1.default.info(`Calling FastAPI at: ${config_1.default.fastapiUrl}/api/workspace/process-workspace`);
            const response = await axios_1.default.post(`${config_1.default.fastapiUrl}/api/workspace/process-workspace`, {
                workspaceId: id,
                sources: sourcesWithValidUrls,
            }, {
                timeout: 300000, // 5 minute timeout for processing
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });
            // Save generated content
            workspace.generatedContent = {
                ...response.data,
                generatedAt: new Date(),
            };
            workspace.isProcessing = false;
            workspace.lastProcessedAt = new Date();
            await workspace.save();
            logger_1.default.info(`Content generated for workspace: ${id}`);
            res.json(workspace);
        }
        catch (error) {
            // Reset processing flag on error
            await Workspace_1.default.updateOne({ _id: req.params.id }, { isProcessing: false });
            next(error);
        }
    },
    /**
     * Update generated content for workspace (save results from FastAPI)
     */
    async updateGeneratedContent(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.userId;
            const content = req.body;
            const workspace = await Workspace_1.default.findOne({ _id: id, userId }).populate('sources');
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
            logger_1.default.info(`Generated content updated (via direct FastAPI) for workspace: ${id}`);
            res.json(workspace);
        }
        catch (error) {
            next(error);
        }
    },
};
exports.default = exports.workspaceController;
//# sourceMappingURL=workspaceController.js.map