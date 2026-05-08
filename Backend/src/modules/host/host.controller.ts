import { Request, Response, NextFunction } from 'express';
import { Product } from '../products/product.model';
import { Order } from '../orders/order.model';
import { sendSuccess, sendPaginated } from '../../utils/apiResponse';

export const listMyProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query = { seller: req.user!._id, isDeleted: false };
    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(query),
    ]);

    return sendPaginated(res, products, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
};

export const listMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const query = { 'items.sellerId': req.user!._id };
    const [orders, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'name email'),
      Order.countDocuments(query),
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

export const getHostAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.user!._id;

    const [
      totalProducts,
      totalOrders,
      revenueData,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      Product.countDocuments({ seller: sellerId, isDeleted: false }),
      Order.countDocuments({ 'items.sellerId': sellerId }),
      Order.aggregate([
        { $match: { 'items.sellerId': sellerId, status: { $in: ['paid', 'delivered', 'processing', 'shipped'] } } },
        { $unwind: '$items' },
        { $match: { 'items.sellerId': sellerId } },
        { $group: { _id: null, total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      ]),
      Order.find({ 'items.sellerId': sellerId }).sort({ createdAt: -1 }).limit(5).populate('userId', 'name'),
      Order.aggregate([
        { $match: { 'items.sellerId': sellerId } },
        { $unwind: '$items' },
        { $match: { 'items.sellerId': sellerId } },
        { $group: { _id: '$items.productId', title: { $first: '$items.title' }, count: { $sum: '$items.quantity' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    return sendSuccess(res, {
      totalProducts,
      totalOrders,
      totalRevenue: revenueData[0]?.total || 0,
      recentOrders,
      topProducts,
    });
  } catch (error) {
    return next(error);
  }
};
