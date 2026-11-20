import { Router } from 'express';
import express from 'express';
import * as payments from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/payments/config', payments.paymentConfig);
router.post('/payments/checkout', protect, payments.createCheckoutSession);
router.post('/payments/mock', payments.mockPayment);

// Must be registered with the raw body parser before JSON middleware.
export const webhookRouter = Router();
webhookRouter.post(
  '/payments/webhook',
  express.raw({ type: 'application/json' }),
  payments.stripeWebhook,
);

export default router;
