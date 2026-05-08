import { Router } from 'express';
import * as ordersController from './orders.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.use(requireAuth);

router.post('/', ordersController.createOrder);
router.get('/', ordersController.listMyOrders);
router.get('/:id', ordersController.getOrder);
router.patch('/:id/cancel', ordersController.cancelOrder);

export default router;
