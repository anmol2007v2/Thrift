import cron from 'node-cron';
import { Cart } from '../modules/cart/cart.model';
import { Coupon } from '../modules/coupons/coupon.model';
import { logger } from '../utils/logger';

export const initCronJobs = () => {
  // Every hour: expire and clean up abandoned carts older than 7 days
  cron.schedule('0 * * * *', async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const result = await Cart.deleteMany({ updatedAt: { $lt: sevenDaysAgo }, 'items.0': { $exists: true } });
      if (result.deletedCount > 0) {
        logger.info(`🧹 Cleaned up ${result.deletedCount} abandoned carts`);
      }
    } catch (error) {
      logger.error('❌ Error in abandoned cart cleanup job:', error);
    }
  });

  // Every day at midnight: deactivate expired coupons
  cron.schedule('0 0 * * *', async () => {
    try {
      const result = await Coupon.updateMany(
        { expiresAt: { $lt: new Date() }, isActive: true },
        { $set: { isActive: false } }
      );
      if (result.modifiedCount > 0) {
        logger.info(`🧹 Deactivated ${result.modifiedCount} expired coupons`);
      }
    } catch (error) {
      logger.error('❌ Error in coupon expiration job:', error);
    }
  });

  logger.info('⏰ Cron jobs initialized');
};
