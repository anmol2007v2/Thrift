import { Request, Response, NextFunction } from 'express';
import { Wishlist } from './wishlist.model';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';

export const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let wishlist = await Wishlist.findOne({ userId: req.user!._id }).populate('products');
    if (!wishlist) {
      wishlist = await Wishlist.create({ userId: req.user!._id, products: [] });
    }
    return sendSuccess(res, wishlist);
  } catch (error) {
    return next(error);
  }
};

export const addProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    let wishlist = await Wishlist.findOne({ userId: req.user!._id });
    if (!wishlist) {
      wishlist = new Wishlist({ userId: req.user!._id, products: [] });
    }

    if (!wishlist.products.includes(productId as any)) {
      wishlist.products.push(productId as any);
      await wishlist.save();
    }

    return sendSuccess(res, wishlist);
  } catch (error) {
    return next(error);
  }
};

export const removeProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const wishlist = await Wishlist.findOne({ userId: req.user!._id });
    if (!wishlist) {
      const error: AppError = new Error('Wishlist not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    wishlist.products = wishlist.products.filter((p) => p.toString() !== productId);
    await wishlist.save();

    return sendSuccess(res, wishlist);
  } catch (error) {
    return next(error);
  }
};
