import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }

    if (!roles.includes(req.user.role)) {
      const error: AppError = new Error('Access forbidden: insufficient permissions');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    return next();
  };
};
