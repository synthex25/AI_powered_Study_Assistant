/**
 * Storage Service - Unified abstraction for S3 and Local filesystem storage
 */
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import config from '../config';
import logger from '../utils/logger';
import { s3Service } from './s3Service';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

// =============================================================================
// Storage Provider Interface
// =============================================================================

export interface IStorageProvider {
  uploadFile(key: string, body: Buffer | string, contentType: string): Promise<{ key: string; url: string }>;
  uploadPDF(workspaceId: string, fileName: string, buffer: Buffer, userEmail?: string): Promise<{ key: string; url: string }>;
  uploadText(workspaceId: string, title: string, content: string, userEmail?: string): Promise<{ key: string; url: string }>;
  getSignedReadUrl(key: string, expiresIn?: number): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getFileContent(key: string): Promise<string>;
  getFileBuffer(key: string): Promise<Buffer>;
  fileExists(key: string): Promise<boolean>;
}

// =============================================================================
// Local Storage Provider
// =============================================================================

class LocalStorageProvider implements IStorageProvider {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = path.resolve(basePath || config.localStoragePath);
    this.ensureBaseDir();
    logger.info(`[LocalStorage] Initialized with base path: ${this.basePath}`);
  }

  private ensureBaseDir(): void {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  private getFullPath(key: string): string {
    // Normalize the key to prevent path traversal
    const safeKey = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.basePath, safeKey);
  }

  private async ensureDir(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  async uploadFile(
    key: string,
    body: Buffer | string,
    contentType: string
  ): Promise<{ key: string; url: string; contentType: string }> {
    const filePath = this.getFullPath(key);
    await this.ensureDir(filePath);

    if (typeof body === 'string') {
      await writeFile(filePath, body, 'utf-8');
    } else {
      await writeFile(filePath, body);
    }

    const publicUrl = await this.getSignedReadUrl(key);
    logger.info(`[LocalStorage] Saved file: ${filePath}`);
    
    return {
      key,
      url: publicUrl,
      contentType,
    };
  }

  async uploadPDF(
    workspaceId: string,
    fileName: string,
    buffer: Buffer,
    userEmail?: string
  ): Promise<{ key: string; url: string }> {
    const key = `${userEmail || 'anonymous'}/workspaces/${workspaceId}/pdfs/${Date.now()}-${fileName}`;
    const result = await this.uploadFile(key, buffer, 'application/pdf');
    return { key: result.key, url: result.url };
  }

  async uploadText(
    workspaceId: string,
    title: string,
    content: string,
    userEmail?: string
  ): Promise<{ key: string; url: string }> {
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
    const key = `${userEmail || 'anonymous'}/workspaces/${workspaceId}/texts/${Date.now()}-${sanitizedTitle}.txt`;
    const result = await this.uploadFile(key, content, 'text/plain');
    return { key: result.key, url: result.url };
  }

  async getSignedReadUrl(key: string, _expiresIn = 3600): Promise<string> {
    // Return HTTP URL pointing to our static file server
    // Use the backend URL (default to localhost:4000 for development)
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${config.port}`;
    return `${baseUrl}/storage/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = this.getFullPath(key);
    if (fs.existsSync(filePath)) {
      await unlink(filePath);
      logger.info(`[LocalStorage] Deleted file: ${filePath}`);
    }
  }

  async getFileContent(key: string): Promise<string> {
    const filePath = this.getFullPath(key);
    return await readFile(filePath, 'utf-8');
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const filePath = this.getFullPath(key);
    return await readFile(filePath);
  }

  async fileExists(key: string): Promise<boolean> {
    const filePath = this.getFullPath(key);
    try {
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the absolute local path for direct file access
   */
  getLocalPath(key: string): string {
    return this.getFullPath(key);
  }
}

// =============================================================================
// S3 Storage Provider (Wrapper around existing s3Service)
// =============================================================================

class S3StorageProvider implements IStorageProvider {
  constructor() {
    logger.info(`[S3Storage] Initialized with bucket: ${config.aws.s3Bucket}`);
  }

  async uploadFile(
    key: string,
    body: Buffer | string,
    contentType: string
  ): Promise<{ key: string; url: string }> {
    return s3Service.uploadFile(key, body, contentType);
  }

  async uploadPDF(
    workspaceId: string,
    fileName: string,
    buffer: Buffer,
    userEmail?: string
  ): Promise<{ key: string; url: string }> {
    return s3Service.uploadPDF(workspaceId, fileName, buffer, userEmail);
  }

  async uploadText(
    workspaceId: string,
    title: string,
    content: string,
    userEmail?: string
  ): Promise<{ key: string; url: string }> {
    return s3Service.uploadText(workspaceId, title, content, userEmail);
  }

  async getSignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
    return s3Service.getSignedReadUrl(key, expiresIn);
  }

  async deleteFile(key: string): Promise<void> {
    return s3Service.deleteFile(key);
  }

  async getFileContent(key: string): Promise<string> {
    return s3Service.getFileContent(key);
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const content = await s3Service.getFileContent(key);
    return Buffer.from(content);
  }

  async fileExists(_key: string): Promise<boolean> {
    // S3 doesn't have a simple exists check, would need HeadObject
    // For now, attempt getFileContent and catch errors
    try {
      await this.getFileContent(_key);
      return true;
    } catch {
      return false;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let _storageProvider: IStorageProvider | null = null;

/**
 * Get the configured storage provider (S3 or Local)
 * 
 * @example
 * ```typescript
 * const storage = getStorageProvider();
 * await storage.uploadPDF(workspaceId, 'doc.pdf', buffer, userEmail);
 * ```
 */
export function getStorageProvider(): IStorageProvider {
  if (_storageProvider === null) {
    const provider = config.storageProvider.toLowerCase();

    if (provider === 's3') {
      _storageProvider = new S3StorageProvider();
    } else if (provider === 'local') {
      _storageProvider = new LocalStorageProvider();
    } else {
      throw new Error(`Unknown storage provider: ${provider}. Available: s3, local`);
    }

    logger.info(`[Storage] Using ${provider.toUpperCase()} storage provider`);
  }

  return _storageProvider;
}

/**
 * Convenience alias for getStorageProvider
 */
export const storageService = {
  get provider(): IStorageProvider {
    return getStorageProvider();
  },

  // Proxy methods for convenience
  async uploadFile(key: string, body: Buffer | string, contentType: string) {
    return this.provider.uploadFile(key, body, contentType);
  },

  async uploadPDF(workspaceId: string, fileName: string, buffer: Buffer, userEmail?: string) {
    return this.provider.uploadPDF(workspaceId, fileName, buffer, userEmail);
  },

  async uploadText(workspaceId: string, title: string, content: string, userEmail?: string) {
    return this.provider.uploadText(workspaceId, title, content, userEmail);
  },

  async getSignedReadUrl(key: string, expiresIn = 3600) {
    return this.provider.getSignedReadUrl(key, expiresIn);
  },

  async deleteFile(key: string) {
    return this.provider.deleteFile(key);
  },

  async getFileContent(key: string) {
    return this.provider.getFileContent(key);
  },

  async getFileBuffer(key: string) {
    return this.provider.getFileBuffer(key);
  },

  async fileExists(key: string) {
    return this.provider.fileExists(key);
  },
};

export default storageService;
