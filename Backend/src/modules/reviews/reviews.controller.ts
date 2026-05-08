import { Request, Response, NextFunction } from 'express';
import { Review } from './review.model';
import { Product } from '../products/product.model';
import { Order } from '../orders/order.model';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    // Verify product exists
    const product = await Product.findById(productId as string);
    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Verify user has purchased the product
    const order = await Order.findOne({
      userId: req.user!._id,
      'items.productId': productId as string,
      status: 'delivered',
    });

    if (!order) {
      const error: AppError = new Error('You can only review products you have purchased and received');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    const review = await Review.create({
      productId: productId as string,
      userId: req.user!._id,
      rating,
      comment,
    });

    // Update product rating
    const reviews = await Review.find({ productId: productId as string });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Product.findByIdAndUpdate(productId as string, {
      avgRating,
      reviewCount: reviews.length,
    });

    return sendSuccess(res, review, 201);
  } catch (error: any) {
    if (error.code === 11000) {
      const err: AppError = new Error('You have already reviewed this product');
      err.statusCode = 409;
      err.code = 'CONFLICT';
      return next(err);
    }
    return next(error);
  }
};

export const listProductReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const reviews = await Review.find({ productId: productId as string }).populate('userId', 'name avatar').sort({ createdAt: -1 });
    return sendSuccess(res, reviews);
  } catch (error) {
    return next(error);
  }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const review = await Review.findOneAndDelete({ _id: id as string, userId: req.user!._id });

    if (!review) {
      const error: AppError = new Error('Review not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    // Update product rating
    const reviews = await Review.find({ productId: review.productId });
    const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    await Product.findByIdAndUpdate(review.productId, {
      avgRating,
      reviewCount: reviews.length,
    });

    return sendSuccess(res, { message: 'Review deleted' });
  } catch (error) {
    return next(error);
  }
};
