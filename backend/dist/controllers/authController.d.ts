import { Request, Response } from 'express';
export declare const googleSignIn: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const register: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const login: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const verifyOtp: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const resendOtp: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const validateToken: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Refresh access token using refresh token
 * Implements token rotation for security
 */
export declare const refreshToken: (req: Request, res: Response, next: import("express").NextFunction) => void;
/**
 * Logout - revokes the refresh token
 */
export declare const logout: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const completeOnboarding: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const me: (req: Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=authController.d.ts.map