import { Model, Types } from 'mongoose';
import { AppError } from '../middleware/errorHandler';

export const assertOwnership = async <T>(
  model: Model<T>,
  resourceId: string,
  userId: string,
  userIdField: string = 'userId'
): Promise<T> => {
  if (!Types.ObjectId.isValid(resourceId)) {
    const error: AppError = new Error('Resource not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const query: any = { _id: resourceId, [userIdField]: userId };
  const resource = await model.findOne(query);

  if (!resource) {
    // Return 404 to avoid revealing resource existence (anti-IDOR)
    const error: AppError = new Error('Resource not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return resource;
};
