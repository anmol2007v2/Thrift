import { Request, Response, NextFunction } from 'express';
import { Order } from './order.model';
import { Cart } from '../cart/cart.model';
import { Product } from '../products/product.model';
import { sendSuccess, sendPaginated } from '../../utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';
import { assertOwnership } from '../../utils/ownershipCheck';

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shippingAddress, couponCode } = req.body;
    const cart = await Cart.findOne({ userId: req.user!._id }).populate('items.productId');

    if (!cart || cart.items.length === 0) {
      const error: AppError = new Error('Cart is empty');
      error.statusCode = 400;
      error.code = 'INVALID_REQUEST';
      throw error;
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of cart.items) {
      const product = item.productId as any;
      if (!product || product.isDeleted || !product.isAvailable || product.stock < item.quantity) {
        const error: AppError = new Error(`Product ${product?.title || 'Unknown'} is unavailable or out of stock`);
        error.statusCode = 422;
        error.code = 'OUT_OF_STOCK';
        throw error;
      }

      orderItems.push({
        productId: product._id,
        sellerId: product.seller, // Snapshot seller
        title: product.title,
        price: product.price, // Snapshot price
        quantity: item.quantity,
        image: product.images[0]?.url || '',
      });

      totalAmount += product.price * item.quantity;
    }

    // Handle coupon logic (stub for now, will be implemented in Coupons module)
    let discountAmount = 0;
    // ... coupon logic here

    const order = await Order.create({
      userId: req.user!._id,
      items: orderItems,
      totalAmount: totalAmount - discountAmount,
      shippingAddress,
      couponCode,
      discountAmount,
    });

    // Clear cart after order creation
    cart.items = [];
    await cart.save();

    return sendSuccess(res, order, 201);
  } catch (error) {
    return next(error);
  }
};

export const listMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ userId: req.user!._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments({ userId: req.user!._id }),
    ]);

    return sendPaginated(res, orders, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
};

export const getOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await assertOwnership(Order, req.params.id as string, req.user!._id);
    return sendSuccess(res, order);
  } catch (error) {
    return next(error);
  }
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await assertOwnership(Order, req.params.id as string, req.user!._id);

    if (order.status !== 'pending') {
      const error: AppError = new Error('Order cannot be cancelled in its current status');
      error.statusCode = 400;
      error.code = 'INVALID_REQUEST';
      throw error;
    }

    order.status = 'cancelled';
    await order.save();

    return sendSuccess(res, order);
  } catch (error) {
    return next(error);
  }
};
