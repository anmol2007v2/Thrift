import { Router } from 'express';
import * as hostController from './host.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

router.use(requireAuth, requireRole('host'));

router.get('/products', hostController.listMyProducts);
router.get('/orders', hostController.listMyOrders);
router.get('/analytics', hostController.getHostAnalytics);

export default router;
