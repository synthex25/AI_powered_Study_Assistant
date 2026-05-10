"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
// Initialize S3 client
const s3Client = new client_s3_1.S3Client({
    region: config_1.default.aws.region,
    credentials: {
        accessKeyId: config_1.default.aws.accessKeyId,
        secretAccessKey: config_1.default.aws.secretAccessKey,
        sessionToken: config_1.default.aws.sessionToken,
    },
    // Add request timeout to prevent hanging on network issues
});
const BUCKET_NAME = config_1.default.aws.s3Bucket;
/**
 * S3 Service for file operations
 */
exports.s3Service = {
    /**
     * Upload a file to S3
     */
    async uploadFile(key, body, contentType) {
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                Body: body,
                ContentType: contentType,
            });
            await s3Client.send(command);
            const url = `https://${BUCKET_NAME}.s3.${config_1.default.aws.region}.amazonaws.com/${key}`;
            logger_1.default.info(`File uploaded to S3: ${key}`);
            return { key, url };
        }
        catch (error) {
            logger_1.default.error('S3 upload error:', error);
            throw new Error('Failed to upload file to S3');
        }
    },
    /**
     * Upload a PDF file
     */
    async uploadPDF(workspaceId, fileName, buffer, userEmail) {
        const key = `${userEmail}/workspaces/${workspaceId}/pdfs/${Date.now()}-${fileName}`;
        return this.uploadFile(key, buffer, 'application/pdf');
    },
    /**
     * Upload text content
     */
    async uploadText(workspaceId, title, content, userEmail) {
        const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_');
        const key = `${userEmail}/workspaces/${workspaceId}/texts/${Date.now()}-${sanitizedTitle}.txt`;
        return this.uploadFile(key, content, 'text/plain');
    },
    /**
     * Get a signed URL for reading a file (valid for 1 hour)
     */
    async getSignedReadUrl(key, expiresIn = 3600) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });
            const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
            return signedUrl;
        }
        catch (error) {
            logger_1.default.error('S3 signed URL error:', error);
            throw new Error('Failed to generate signed URL');
        }
    },
    /**
     * Delete a file from S3
     */
    async deleteFile(key) {
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });
            await s3Client.send(command);
            logger_1.default.info(`File deleted from S3: ${key}`);
        }
        catch (error) {
            logger_1.default.error('S3 delete error:', error);
            throw new Error('Failed to delete file from S3');
        }
    },
    /**
     * Get file content from S3
     */
    async getFileContent(key) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });
            const response = await s3Client.send(command);
            const content = await response.Body?.transformToString();
            return content || '';
        }
        catch (error) {
            logger_1.default.error('S3 get file error:', error);
            throw new Error('Failed to get file from S3');
        }
    },
};
exports.default = exports.s3Service;
//# sourceMappingURL=s3Service.js.map