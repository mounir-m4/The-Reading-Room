import { Router } from 'express';
import {
  register, login, adminLogin, refresh, logout, me, verifyEmail,
  forgotPassword, resetPassword, updateProfile, changePassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema, forgotSchema, resetSchema, verifySchema } from '../validators/index.js';
import { authLimiter } from '../middleware/security.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/admin/login', authLimiter, validate(loginSchema), adminLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, me);
router.post('/verify-email', validate(verifySchema), verifyEmail);
router.post('/forgot-password', authLimiter, validate(forgotSchema), forgotPassword);
router.post('/reset-password', validate(resetSchema), resetPassword);
router.put('/profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);

export default router;
