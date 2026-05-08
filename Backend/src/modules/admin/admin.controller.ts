import { Request, Response, NextFunction } from 'express';
import { User } from '../users/user.model';
import { Product } from '../products/product.model';
import { Order } from '../orders/order.model';
import { sendSuccess, sendPaginated } from '../../utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';

export const listAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    return sendPaginated(res, users, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return next(error);
  }
};

export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) {
      const error: AppError = new Error('User not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    return sendSuccess(res, user);
  } catch (error) {
    return next(error);
  }
};

export const updateUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!user) {
      const error: AppError = new Error('User not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    return sendSuccess(res, user);
  } catch (error) {
    return next(error);
  }
};

export const listAllOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const query: any = {};
    if (status) query.status = status;

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

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) {
      const error: AppError = new Error('Order not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    return sendSuccess(res, order);
  } catch (error) {
    return next(error);
  }
};

export const getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      revenueData,
      statusData,
      recentOrders,
      topProducts,
      monthlyRevenue,
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments({ isDeleted: false }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: { $in: ['paid', 'delivered', 'processing', 'shipped'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'name'),
      Order.aggregate([
        { $unwind: '$items' },
        { $group: { _id: '$items.productId', title: { $first: '$items.title' }, count: { $sum: '$items.quantity' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Order.aggregate([
        { $match: { status: { $in: ['paid', 'delivered', 'processing', 'shipped'] } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 6 },
      ]),
    ]);

    const ordersByStatus: Record<string, number> = {};
    statusData.forEach((item) => {
      ordersByStatus[item._id] = item.count;
    });

    return sendSuccess(res, {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: revenueData[0]?.total || 0,
      ordersByStatus,
      recentOrders,
      topProducts,
      monthlyRevenue: monthlyRevenue.map((m) => ({ month: m._id, revenue: m.revenue })),
    });
  } catch (error) {
    return next(error);
  }
};
