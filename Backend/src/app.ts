import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { sendSuccess } from './utils/apiResponse';

// Import Routes
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import productsRoutes from './modules/products/products.routes';
import cartRoutes from './modules/cart/cart.routes';
import wishlistRoutes from './modules/wishlist/wishlist.routes';
import ordersRoutes from './modules/orders/orders.routes';
import paymentsRoutes from './modules/orders/payments.routes';
import reviewsRoutes from './modules/reviews/reviews.routes';
import couponsRoutes from './modules/coupons/coupons.routes';
import adminRoutes from './modules/admin/admin.routes';
import hostRoutes from './modules/host/host.routes';

const app = express();

// 1. Express 5 compatibility shim (make req.query/params writable)
app.use((req, res, next) => {
  const query = req.query;
  const params = req.params;
  Object.defineProperty(req, 'query', { value: query, writable: true, configurable: true, enumerable: true });
  Object.defineProperty(req, 'params', { value: params, writable: true, configurable: true, enumerable: true });
  next();
});

// 2. Sentry Request Handler
if (env.SENTRY_DSN && !env.SENTRY_DSN.includes('your_sentry_dsn_here')) {
  Sentry.init({ dsn: env.SENTRY_DSN });
}

// 3. Helmet (Security headers)
app.use(helmet());

// 4. CORS
app.use(
  cors({
    origin: env.CORS_ORIGINS.split(','),
    credentials: true,
  })
);

// Special handling for Stripe raw body
app.use(
  express.json({
    limit: '10kb',
    verify: (req: any, res, buf) => {
      if (req.originalUrl.includes('/webhook')) {
        req.rawBody = buf;
      }
    },
  })
);

// 5. Body Parsers
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// 6. Mongo Sanitize
app.use(mongoSanitize());

// 7. Morgan (Logging)
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 8. Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  skipSuccessfulRequests: true,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many auth attempts' } },
});

app.use('/api', globalLimiter);
app.use('/api/v1/auth', authLimiter);

// Root Route
app.get('/', (req, res) => {
  return sendSuccess(res, {
    message: 'Welcome to the Thrift Store API',
    version: '1.0.0',
    status: 'operational',
    docs: '/api/v1',
    health: '/health'
  });
});

// Health Checks
app.get('/health', (req, res) => sendSuccess(res, { status: 'up' }));
app.get('/ready', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  if (!isConnected) {
    return res.status(503).json({ success: false, error: { code: 'NOT_READY', message: 'MongoDB not connected' } });
  }
  return sendSuccess(res, { status: 'ready' });
});

// 9. Routes
app.get('/api/v1', (req, res) => {
  return sendSuccess(res, {
    message: 'Thrift Store API v1',
    modules: [
      'auth', 'users', 'products', 'cart', 'wishlist', 
      'orders', 'payments', 'reviews', 'coupons', 'admin', 'host'
    ],
    documentation: 'Refer to api_testing_guide.md for cURL examples'
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/reviews', reviewsRoutes);
app.use('/api/v1/coupons', couponsRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/host', hostRoutes);

// 10. Sentry Error Handler
if (env.SENTRY_DSN && !env.SENTRY_DSN.includes('your_sentry_dsn_here')) {
  Sentry.setupExpressErrorHandler(app);
}

// 11. Central Error Handler
app.use(errorHandler);

export default app;
