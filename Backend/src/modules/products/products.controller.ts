import { Request, Response, NextFunction } from 'express';
import { Product } from './product.model';
import { sendSuccess, sendPaginated } from '../../utils/apiResponse';
import { uploadToCloudinary, deleteFromCloudinary } from '../../services/upload.service';
import { AppError } from '../../middleware/errorHandler';

export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, category, condition, minPrice, maxPrice, sort } = req.query as any;
    const skip = (page - 1) * limit;

    const query: any = { isDeleted: false };
    if (search) query.$text = { $search: search };
    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = minPrice;
      if (maxPrice) query.price.$lte = maxPrice;
    }

    let sortOption: any = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'popular') sortOption = { reviewCount: -1, avgRating: -1 };

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortOption).skip(skip).limit(limit).populate('seller', 'name avatar'),
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

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await Product.findOne({ _id: req.params.id as string, isDeleted: false }).populate('seller', 'name avatar');
    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }
    return sendSuccess(res, product);
  } catch (error) {
    return next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      const error: AppError = new Error('At least one image is required');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const images = await Promise.all(
      files.map((file) => uploadToCloudinary(file, 'thriftstore/products'))
    );

    const product = await Product.create({
      ...req.body,
      images,
      seller: req.user!._id,
    });

    return sendSuccess(res, product, 201);
  } catch (error) {
    return next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: any = { _id: req.params.id as string, isDeleted: false };
    if (req.user!.role !== 'admin') {
      query.seller = req.user!._id;
    }

    const product = await Product.findOneAndUpdate(
      query,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    return sendSuccess(res, product);
  } catch (error) {
    return next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query: any = { _id: req.params.id as string, isDeleted: false };
    if (req.user!.role !== 'admin') {
      query.seller = req.user!._id;
    }

    const product = await Product.findOneAndUpdate(
      query,
      { $set: { isDeleted: true, deletedAt: new Date(), isAvailable: false } }
    );

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    return sendSuccess(res, { message: 'Product deleted' });
  } catch (error) {
    return next(error);
  }
};

export const uploadImages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    const query: any = { _id: req.params.id as string, isDeleted: false };
    if (req.user!.role !== 'admin') {
      query.seller = req.user!._id;
    }

    const product = await Product.findOne(query);

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (product.images.length + files.length > 5) {
      const error: AppError = new Error('Maximum 5 images allowed per product');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const newImages = await Promise.all(
      files.map((file) => uploadToCloudinary(file, `thriftstore/products/${product._id}`))
    );

    product.images.push(...newImages);
    await product.save();

    return sendSuccess(res, product);
  } catch (error) {
    return next(error);
  }
};

export const removeImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const publicId = req.params.publicId as string;
    const query: any = { _id: req.params.id as string, isDeleted: false };
    if (req.user!.role !== 'admin') {
      query.seller = req.user!._id;
    }

    const product = await Product.findOne(query);

    if (!product) {
      const error: AppError = new Error('Product not found');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    product.images = product.images.filter((img) => img.publicId !== publicId);
    await Promise.all([product.save(), deleteFromCloudinary(publicId)]);

    return sendSuccess(res, product);
  } catch (error) {
    return next(error);
  }
};
