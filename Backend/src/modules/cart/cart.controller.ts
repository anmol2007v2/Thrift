import { Request, Response, NextFunction } from 'express';
import { Cart } from './cart.model';
import { Product } from '../products/product.model';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let cart = await Cart.findOne({ userId: req.user!._id }).populate('items.productId');
    if (!cart) {
      cart = await Cart.create({ userId: req.user!._id, items: [] });
    }
    return sendSuccess(res, cart);
  } catch (error) {
    return next(error);
  }
};

export const addItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId);

    if (!product || product.isDeleted || !product.isAvailable) {
      const error: AppError = new Error('Product not found or unavailable');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (product.stock < quantity) {
      const error: AppError = new Error('Insufficient stock');
      error.statusCode = 422;
      error.code = 'OUT_OF_STOCK';
      throw error;
    }

    let cart = await Cart.findOne({ userId: req.user!._id });
    if (!cart) {
      cart = new Cart({ userId: req.user!._id, items: [] });
    }

    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }

    await cart.save();
    return sendSuccess(res, cart);
  } catch (error) {
    return next(error);
  }
};

export const updateItemQuantity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { quantity } = req.body;
    const { productId } = req.params;

    const cart = await Cart.findOne({ userId: req.user!._id });
    if (!cart) {
      const error: AppError = new Error('Cart not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const itemIndex = cart.items.findIndex((item) => item.productId.toString() === productId);
    if (itemIndex === -1) {
      const error: AppError = new Error('Item not in cart');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    return sendSuccess(res, cart);
  } catch (error) {
    return next(error);
  }
};

export const removeItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const cart = await Cart.findOne({ userId: req.user!._id });
    if (!cart) {
      const error: AppError = new Error('Cart not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    cart.items = cart.items.filter((item) => item.productId.toString() !== productId);
    await cart.save();

    return sendSuccess(res, cart);
  } catch (error) {
    return next(error);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Cart.findOneAndUpdate({ userId: req.user!._id }, { $set: { items: [] } });
    return sendSuccess(res, { message: 'Cart cleared' });
  } catch (error) {
    return next(error);
  }
};
