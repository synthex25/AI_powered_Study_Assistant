import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { AuthRequest, IJwtPayload } from '../types';
import { sendUnauthorized } from '../utils/apiResponse';
import logger from '../utils/logger';

const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    sendUnauthorized(res, 'No token provided');
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as IJwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Token verification failed:', { error: (error as Error).message });
    sendUnauthorized(res, 'Invalid or expired token');
  }
};

export default verifyToken;
