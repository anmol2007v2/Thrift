import { Router } from 'express';
import * as paymentsController from './payments.controller';
import { requireAuth } from '../../middleware/requireAuth';

const router = Router();

router.post('/create-intent', requireAuth, paymentsController.createPaymentIntent);
router.post('/webhook', paymentsController.handleWebhook);

export default router;
