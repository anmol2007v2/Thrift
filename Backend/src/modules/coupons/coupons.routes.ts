import { Router } from 'express';
import * as couponsController from './coupons.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

router.post('/validate', requireAuth, couponsController.validateCoupon);

// Admin only routes
router.use(requireAuth, requireRole('admin'));

router.post('/', couponsController.createCoupon);
router.get('/', couponsController.listAllCoupons);
router.delete('/:id', couponsController.deactivateCoupon);

export default router;
