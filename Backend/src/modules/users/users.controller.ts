import { Request, Response, NextFunction } from 'express';
import { User } from './user.model';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';
import bcrypt from 'bcryptjs';

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    return sendSuccess(res, user);
  } catch (error) {
    return next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user!._id).select('+password');

    if (!user || !(await user.comparePassword(currentPassword))) {
      const error: AppError = new Error('Invalid current password');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      throw error;
    }

    user.password = newPassword;
    await user.save();

    return sendSuccess(res, { message: 'Password changed successfully' });
  } catch (error) {
    return next(error);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { confirmation } = req.body;
    if (confirmation !== 'DELETE MY ACCOUNT') {
      const error: AppError = new Error('Invalid confirmation text');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    await User.findByIdAndUpdate(req.user!._id, {
      $set: { isActive: false, isDeleted: true, deletedAt: new Date() }
    });

    return sendSuccess(res, { message: 'Account deactivated' });
  } catch (error) {
    return next(error);
  }
};
