export interface IStorageProvider {
    uploadFile(key: string, body: Buffer | string, contentType: string): Promise<{
        key: string;
        url: string;
    }>;
    uploadPDF(workspaceId: string, fileName: string, buffer: Buffer, userEmail?: string): Promise<{
        key: string;
        url: string;
    }>;
    uploadText(workspaceId: string, title: string, content: string, userEmail?: string): Promise<{
        key: string;
        url: string;
    }>;
    getSignedReadUrl(key: string, expiresIn?: number): Promise<string>;
    deleteFile(key: string): Promise<void>;
    getFileContent(key: string): Promise<string>;
    getFileBuffer(key: string): Promise<Buffer>;
    fileExists(key: string): Promise<boolean>;
}
/**
 * Get the configured storage provider (S3 or Local)
 *
 * @example
 * ```typescript
 * const storage = getStorageProvider();
 * await storage.uploadPDF(workspaceId, 'doc.pdf', buffer, userEmail);
 * ```
 */
export declare function getStorageProvider(): IStorageProvider;
/**
 * Convenience alias for getStorageProvider
 */
export declare const storageService: {
    readonly provider: IStorageProvider;
    uploadFile(key: string, body: Buffer | string, contentType: string): Promise<{
        key: string;
        url: string;
    }>;
    uploadPDF(workspaceId: string, fileName: string, buffer: Buffer, userEmail?: string): Promise<{
        key: string;
        url: string;
    }>;
    uploadText(workspaceId: string, title: string, content: string, userEmail?: string): Promise<{
        key: string;
        url: string;
    }>;
    getSignedReadUrl(key: string, expiresIn?: number): Promise<string>;
    deleteFile(key: string): Promise<void>;
    getFileContent(key: string): Promise<string>;
    getFileBuffer(key: string): Promise<Buffer<ArrayBufferLike>>;
    fileExists(key: string): Promise<boolean>;
};
export default storageService;
//# sourceMappingURL=storageService.d.ts.map