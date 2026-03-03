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

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  code?: string,
  errors?: unknown[]
): Response<ApiResponse<never>> => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    errors,
  });
};

export const sendCreated = <T>(res: Response, data: T, message?: string): Response<ApiResponse<T>> => {
  return sendSuccess(res, data, message, 201);
};

export const sendNotFound = (res: Response, message = 'Resource not found'): Response<ApiResponse<never>> => {
  return sendError(res, message, 404, 'NOT_FOUND');
};

export const sendUnauthorized = (res: Response, message = 'Unauthorized'): Response<ApiResponse<never>> => {
  return sendError(res, message, 401, 'UNAUTHORIZED');
};

export const sendBadRequest = (res: Response, message: string, errors?: unknown[]): Response<ApiResponse<never>> => {
  return sendError(res, message, 400, 'BAD_REQUEST', errors);
};
