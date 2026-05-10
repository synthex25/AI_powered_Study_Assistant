"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
exports.getStorageProvider = getStorageProvider;
/**
 * Storage Service - Unified abstraction for S3 and Local filesystem storage
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
const s3Service_1 = require("./s3Service");
const mkdir = (0, util_1.promisify)(fs_1.default.mkdir);
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const readFile = (0, util_1.promisify)(fs_1.default.readFile);
const unlink = (0, util_1.promisify)(fs_1.default.unlink);
const stat = (0, util_1.promisify)(fs_1.default.stat);
// =============================================================================
// Local Storage Provider
// =============================================================================
class LocalStorageProvider {
    constructor(basePath) {
        this.basePath = path_1.default.resolve(basePath || config_1.default.localStoragePath);
        this.ensureBaseDir();
        logger_1.default.info(`[LocalStorage] Initialized with base path: ${this.basePath}`);
    }
    ensureBaseDir() {
        if (!fs_1.default.existsSync(this.basePath)) {
            fs_1.default.mkdirSync(this.basePath, { recursive: true });
        }
    }
    getFullPath(key) {
        // Normalize the key to prevent path traversal
        const safeKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
        return path_1.default.join(this.basePath, safeKey);
    }
    async ensureDir(filePath) {
        const dir = path_1.default.dirname(filePath);
        if (!fs_1.default.existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }
    }
    async uploadFile(key, body, contentType) {
        const filePath = this.getFullPath(key);
        await this.ensureDir(filePath);
        if (typeof body === 'string') {
            await writeFile(filePath, body, 'utf-8');
        }
        else {
            await writeFile(filePath, body);
        }
        const publicUrl = await this.getSignedReadUrl(key);
        logger_1.default.info(`[LocalStorage] Saved file: ${filePath}`);
        return {
            key,
            url: publicUrl,
            contentType,
        };
    }
    async uploadPDF(workspaceId, fileName, buffer, userEmail) {
        const key = `${userEmail || 'anonymous'}/workspaces/${workspaceId}/pdfs/${Date.now()}-${fileName}`;
        const result = await this.uploadFile(key, buffer, 'application/pdf');
        return { key: result.key, url: result.url };
    }
    async uploadText(workspaceId, title, content, userEmail) {
        const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
        const key = `${userEmail || 'anonymous'}/workspaces/${workspaceId}/texts/${Date.now()}-${sanitizedTitle}.txt`;
        const result = await this.uploadFile(key, content, 'text/plain');
        return { key: result.key, url: result.url };
    }
    async getSignedReadUrl(key, _expiresIn = 3600) {
        // Return HTTP URL pointing to our static file server
        // Use the backend URL (default to localhost:4000 for development)
        const baseUrl = process.env.BACKEND_URL || `http://localhost:${config_1.default.port}`;
        return `${baseUrl}/storage/${key}`;
    }
    async deleteFile(key) {
        const filePath = this.getFullPath(key);
        if (fs_1.default.existsSync(filePath)) {
            await unlink(filePath);
            logger_1.default.info(`[LocalStorage] Deleted file: ${filePath}`);
        }
    }
    async getFileContent(key) {
        const filePath = this.getFullPath(key);
        return await readFile(filePath, 'utf-8');
    }
    async getFileBuffer(key) {
        const filePath = this.getFullPath(key);
        return await readFile(filePath);
    }
    async fileExists(key) {
        const filePath = this.getFullPath(key);
        try {
            await stat(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Get the absolute local path for direct file access
     */
    getLocalPath(key) {
        return this.getFullPath(key);
    }
}
// =============================================================================
// S3 Storage Provider (Wrapper around existing s3Service)
// =============================================================================
class S3StorageProvider {
    constructor() {
        logger_1.default.info(`[S3Storage] Initialized with bucket: ${config_1.default.aws.s3Bucket}`);
    }
    async uploadFile(key, body, contentType) {
        return s3Service_1.s3Service.uploadFile(key, body, contentType);
    }
    async uploadPDF(workspaceId, fileName, buffer, userEmail) {
        return s3Service_1.s3Service.uploadPDF(workspaceId, fileName, buffer, userEmail);
    }
    async uploadText(workspaceId, title, content, userEmail) {
        return s3Service_1.s3Service.uploadText(workspaceId, title, content, userEmail);
    }
    async getSignedReadUrl(key, expiresIn = 3600) {
        return s3Service_1.s3Service.getSignedReadUrl(key, expiresIn);
    }
    async deleteFile(key) {
        return s3Service_1.s3Service.deleteFile(key);
    }
    async getFileContent(key) {
        return s3Service_1.s3Service.getFileContent(key);
    }
    async getFileBuffer(key) {
        const content = await s3Service_1.s3Service.getFileContent(key);
        return Buffer.from(content);
    }
    async fileExists(_key) {
        // S3 doesn't have a simple exists check, would need HeadObject
        // For now, attempt getFileContent and catch errors
        try {
            await this.getFileContent(_key);
            return true;
        }
        catch {
            return false;
        }
    }
}
// =============================================================================
// Factory Function
// =============================================================================
let _storageProvider = null;
/**
 * Get the configured storage provider (S3 or Local)
 *
 * @example
 * ```typescript
 * const storage = getStorageProvider();
 * await storage.uploadPDF(workspaceId, 'doc.pdf', buffer, userEmail);
 * ```
 */
function getStorageProvider() {
    if (_storageProvider === null) {
        const provider = config_1.default.storageProvider.toLowerCase();
        if (provider === 's3') {
            _storageProvider = new S3StorageProvider();
        }
        else if (provider === 'local') {
            _storageProvider = new LocalStorageProvider();
        }
        else {
            throw new Error(`Unknown storage provider: ${provider}. Available: s3, local`);
        }
        logger_1.default.info(`[Storage] Using ${provider.toUpperCase()} storage provider`);
    }
    return _storageProvider;
}
/**
 * Convenience alias for getStorageProvider
 */
exports.storageService = {
    get provider() {
        return getStorageProvider();
    },
    // Proxy methods for convenience
    async uploadFile(key, body, contentType) {
        return this.provider.uploadFile(key, body, contentType);
    },
    async uploadPDF(workspaceId, fileName, buffer, userEmail) {
        return this.provider.uploadPDF(workspaceId, fileName, buffer, userEmail);
    },
    async uploadText(workspaceId, title, content, userEmail) {
        return this.provider.uploadText(workspaceId, title, content, userEmail);
    },
    async getSignedReadUrl(key, expiresIn = 3600) {
        return this.provider.getSignedReadUrl(key, expiresIn);
    },
    async deleteFile(key) {
        return this.provider.deleteFile(key);
    },
    async getFileContent(key) {
        return this.provider.getFileContent(key);
    },
    async getFileBuffer(key) {
        return this.provider.getFileBuffer(key);
    },
    async fileExists(key) {
        return this.provider.fileExists(key);
    },
};
exports.default = exports.storageService;
//# sourceMappingURL=storageService.js.map