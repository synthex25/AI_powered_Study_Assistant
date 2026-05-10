/**
 * S3 Service for file operations
 */
export declare const s3Service: {
    /**
     * Upload a file to S3
     */
    uploadFile(key: string, body: Buffer | string, contentType: string): Promise<{
        key: string;
        url: string;
    }>;
    /**
     * Upload a PDF file
     */
    uploadPDF(workspaceId: string, fileName: string, buffer: Buffer, userEmail?: string): Promise<{
        key: string;
        url: string;
    }>;
    /**
     * Upload text content
     */
    uploadText(workspaceId: string, title: string, content: string, userEmail?: string): Promise<{
        key: string;
        url: string;
    }>;
    /**
     * Get a signed URL for reading a file (valid for 1 hour)
     */
    getSignedReadUrl(key: string, expiresIn?: number): Promise<string>;
    /**
     * Delete a file from S3
     */
    deleteFile(key: string): Promise<void>;
    /**
     * Get file content from S3
     */
    getFileContent(key: string): Promise<string>;
};
export default s3Service;
//# sourceMappingURL=s3Service.d.ts.map