import { Router } from 'express';
import auth from './auth.routes.js';
import catalog from './catalog.routes.js';
import commerce from './commerce.routes.js';
import content from './content.routes.js';
import admin from './admin.routes.js';
import payments, { webhookRouter } from './payment.routes.js';

const router = Router();

// Lightweight liveness check for hosting platforms and uptime monitors.
router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

// Stripe needs the untouched raw body for signature verification.
router.use(webhookRouter);

router.use('/auth', auth);
router.use('/', catalog);
router.use('/', commerce);
router.use('/', content);
router.use('/', admin);
router.use('/', payments);

export default router;
