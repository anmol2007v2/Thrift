import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { createError } from '../utils/apiResponse';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  fields?: Record<string, string[]>;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  // Log error (avoid logging stack in production for some errors if needed)
  logger.error(`${statusCode} - ${message}`, {
    url: req.originalUrl,
    method: req.method,
    stack: err.stack,
    code,
  });

  return res.status(statusCode).json({
    success: false,
    error: createError(code, message, err.fields),
  });
};
