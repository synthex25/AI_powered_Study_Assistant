import { Request, Response, NextFunction } from 'express';
interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
    };
    file?: Express.Multer.File;
}
/**
 * Workspace Controller - Handles all workspace and source operations
 */
export declare const workspaceController: {
    /**
     * Create a new workspace
     */
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get all workspaces for user
     */
    list(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Get single workspace with sources
     */
    getById(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Update workspace
     */
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Delete workspace and all sources
     */
    delete(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Add PDF source to workspace
     */
    addPdfSource(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Add text source to workspace
     */
    addTextSource(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Add URL source to workspace
     */
    addUrlSource(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Remove source from workspace
     */
    removeSource(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Get signed URL for a source
     */
    getSourceUrl(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Generate content for workspace (calls FastAPI)
     */
    generateContent(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    /**
     * Update generated content for workspace (save results from FastAPI)
     */
    updateGeneratedContent(req: AuthRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
};
export default workspaceController;
//# sourceMappingURL=workspaceController.d.ts.map