import { Router } from 'express';
import * as payments from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/payments/config', payments.paymentConfig);
router.post('/payments/checkout', protect, payments.createCheckoutSession);
router.post('/payments/mock', payments.mockPayment);

// The raw payload is captured by app.js before express.json parses the body.
export const webhookRouter = Router();
webhookRouter.post('/payments/webhook', payments.stripeWebhook);

export default router;
