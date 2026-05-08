import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../modules/users/user.model';
import { Product } from '../modules/products/product.model';
import { logger } from '../utils/logger';

const seed = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('Connected to DB for seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});

    // Create Admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@thriftstore.com',
      password: 'password123',
      role: 'admin',
    });

    // Create Customer
    const customer = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'customer',
    });

    // Create Host
    const host = await User.create({
      name: 'Seller Jane',
      email: 'jane@example.com',
      password: 'password123',
      role: 'host',
    });

    // Create Sample Product
    await Product.create({
      title: 'Vintage Denim Jacket',
      description: 'A classic 90s denim jacket in great condition.',
      price: 4500, // $45.00
      condition: 'good',
      category: 'clothing',
      images: [{ url: 'https://example.com/jacket.jpg', publicId: 'sample/jacket' }],
      stock: 1,
      seller: host._id, // Owned by host
      tags: ['vintage', 'denim', '90s'],
    });

    logger.info('✅ Seeding completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
