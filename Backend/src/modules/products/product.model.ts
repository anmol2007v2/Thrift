import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  title: string;
  description: string;
  price: number;
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  category: 'clothing' | 'shoes' | 'accessories' | 'bags' | 'other';
  images: { url: string; publicId: string }[];
  stock: number;
  isAvailable: boolean;
  tags: string[];
  seller: mongoose.Types.ObjectId;
  avgRating: number;
  reviewCount: number;
  isDeleted: boolean;
  deletedAt?: Date;
}

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    condition: {
      type: String,
      enum: ['new', 'like_new', 'good', 'fair', 'poor'],
      required: true,
    },
    category: {
      type: String,
      enum: ['clothing', 'shoes', 'accessories', 'bags', 'other'],
      required: true,
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    stock: { type: Number, default: 1, min: 0 },
    isAvailable: { type: Boolean, default: true },
    tags: [String],
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, condition: 1, isAvailable: 1, isDeleted: 1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
