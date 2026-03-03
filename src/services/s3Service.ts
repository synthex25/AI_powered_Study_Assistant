import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../config';
import logger from '../utils/logger';

// Initialize S3 client
const s3Client = new S3Client({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
    sessionToken: config.aws.sessionToken,
  },
  // Add request timeout to prevent hanging on network issues
  
});

const BUCKET_NAME = config.aws.s3Bucket;

/**
 * S3 Service for file operations
 */
export const s3Service = {
  /**
   * Upload a file to S3
   */
  async uploadFile(
    key: string,
    body: Buffer | string,
    contentType: string
  ): Promise<{ key: string; url: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      await s3Client.send(command);
      
      const url = `https://${BUCKET_NAME}.s3.${config.aws.region}.amazonaws.com/${key}`;
      
      logger.info(`File uploaded to S3: ${key}`);
      return { key, url };
    } catch (error) {
      logger.error('S3 upload error:', error);
      throw new Error('Failed to upload file to S3');
    }
  },

  /**
   * Upload a PDF file
   */
  async uploadPDF(
    workspaceId: string,
    fileName: string,
    buffer: Buffer,
    userEmail?: string
  ): Promise<{ key: string; url: string }> {
    const key = `${userEmail}/workspaces/${workspaceId}/pdfs/${Date.now()}-${fileName}`;
    return this.uploadFile(key, buffer, 'application/pdf');
  },

  /**
   * Upload text content
   */
  async uploadText(
    workspaceId: string,
    title: string,
    content: string,
    userEmail?: string
  ): Promise<{ key: string; url: string }> {
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
    const key = `${userEmail}/workspaces/${workspaceId}/texts/${Date.now()}-${sanitizedTitle}.txt`;
    return this.uploadFile(key, content, 'text/plain');
  },

  /**
   * Get a signed URL for reading a file (valid for 1 hour)
   */
  async getSignedReadUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      logger.error('S3 signed URL error:', error);
      throw new Error('Failed to generate signed URL');
    }
  },

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      logger.info(`File deleted from S3: ${key}`);
    } catch (error) {
      logger.error('S3 delete error:', error);
      throw new Error('Failed to delete file from S3');
    }
  },

  /**
   * Get file content from S3
   */
  async getFileContent(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      const content = await response.Body?.transformToString();
      return content || '';
    } catch (error) {
      logger.error('S3 get file error:', error);
      throw new Error('Failed to get file from S3');
    }
  },
};

export default s3Service;
