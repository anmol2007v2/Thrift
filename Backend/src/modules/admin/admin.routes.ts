import { Router } from 'express';
import * as adminController from './admin.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/users', adminController.listAllUsers);
router.patch('/users/:id/role', adminController.updateUserRole);
router.patch('/users/:id/status', adminController.updateUserStatus);

router.get('/orders', adminController.listAllOrders);
router.patch('/orders/:id/status', adminController.updateOrderStatus);

router.get('/analytics', adminController.getAnalytics);

export default router;
