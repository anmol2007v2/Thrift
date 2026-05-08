import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from './errorHandler';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      throw error;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    req.user = {
      ...decoded,
      _id: decoded.userId,
    };

    return next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      const err: AppError = new Error('Token expired');
      err.statusCode = 401;
      err.code = 'TOKEN_EXPIRED';
      return next(err);
    }
    if (error.name === 'JsonWebTokenError') {
      const err: AppError = new Error('Invalid token');
      err.statusCode = 401;
      err.code = 'TOKEN_INVALID';
      return next(err);
    }
    return next(error);
  }
};
