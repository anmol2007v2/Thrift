import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { env } from '../../config/env';
import { Order } from './order.model';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27-ac.0' as any, // Using a recent stable version
});

export const createPaymentIntent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ _id: orderId, userId: req.user!._id, status: 'pending' });

    if (!order) {
      const error: AppError = new Error('Order not found or already processed');
      error.statusCode = 404;
      error.code = 'NOT_FOUND';
      throw error;
    }

    const intent = await stripe.paymentIntents.create({
      amount: order.totalAmount, // Already in smallest unit
      currency: 'usd',
      metadata: { orderId: order._id.toString(), userId: req.user!._id },
    });

    order.paymentIntentId = intent.id;
    await order.save();

    return sendSuccess(res, { clientSecret: intent.client_secret });
  } catch (error) {
    return next(error);
  }
};

export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  const sig = req.headers['stripe-signature']!;
  let event: any;

  try {
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody, // Need to handle raw body in app.ts
      sig,
      env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    logger.error('⚠️ Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as any;
      const orderId = paymentIntent.metadata.orderId;
      await Order.findByIdAndUpdate(orderId, { status: 'paid' });
      logger.info(`💰 Payment succeeded for order ${orderId}`);
      break;
    case 'payment_intent.payment_failed':
      logger.error('❌ Payment failed');
      break;
    default:
      logger.info(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};
