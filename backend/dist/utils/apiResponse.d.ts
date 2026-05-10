import { Response } from 'express';
interface SuccessResponse<T> {
    success: true;
    data: T;
    message?: string;
}
interface ErrorResponse {
    success: false;
    message: string;
    code?: string;
    errors?: unknown[];
}
type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
export declare const sendSuccess: <T>(res: Response, data: T, message?: string, statusCode?: number) => Response<ApiResponse<T>>;
export declare const sendError: (res: Response, message: string, statusCode?: number, code?: string, errors?: unknown[]) => Response<ApiResponse<never>>;
export declare const sendCreated: <T>(res: Response, data: T, message?: string) => Response<ApiResponse<T>>;
export declare const sendNotFound: (res: Response, message?: string) => Response<ApiResponse<never>>;
export declare const sendUnauthorized: (res: Response, message?: string) => Response<ApiResponse<never>>;
export declare const sendBadRequest: (res: Response, message: string, errors?: unknown[]) => Response<ApiResponse<never>>;
export {};
//# sourceMappingURL=apiResponse.d.ts.map