import { Request, Response, NextFunction } from 'express';
import { Coupon } from './coupon.model';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';

export const createCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await Coupon.create(req.body);
    return sendSuccess(res, coupon, 201);
  } catch (error: any) {
    if (error.code === 11000) {
      const err: AppError = new Error('Coupon code already exists');
      err.statusCode = 409;
      err.code = 'CONFLICT';
      return next(err);
    }
    return next(error);
  }
};

export const listAllCoupons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return sendSuccess(res, coupons);
  } catch (error) {
    return next(error);
  }
};

export const validateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, orderAmount } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

    if (!coupon) {
      const error: AppError = new Error('Invalid or inactive coupon');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (coupon.expiresAt < new Date()) {
      const error: AppError = new Error('Coupon has expired');
      error.statusCode = 400;
      error.code = 'INVALID_REQUEST';
      throw error;
    }

    if (coupon.usedCount >= coupon.maxUses) {
      const error: AppError = new Error('Coupon usage limit reached');
      error.statusCode = 400;
      error.code = 'INVALID_REQUEST';
      throw error;
    }

    if (orderAmount < coupon.minOrderAmount) {
      const error: AppError = new Error(`Minimum order amount of ${coupon.minOrderAmount} required`);
      error.statusCode = 400;
      error.code = 'INVALID_REQUEST';
      throw error;
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (orderAmount * coupon.discountValue) / 100;
    } else {
      discountAmount = coupon.discountValue;
    }

    return sendSuccess(res, {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
    });
  } catch (error) {
    return next(error);
  }
};

export const deactivateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!coupon) {
      const error: AppError = new Error('Coupon not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    return sendSuccess(res, coupon);
  } catch (error) {
    return next(error);
  }
};
