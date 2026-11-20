import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { Admin } from '../models/Admin.js';
import { Role } from '../models/Role.js';
import { signAccess, issueRefresh, rotateRefresh, revokeRefresh, revokeAllFor } from '../services/tokenService.js';
import { sendTemplate } from '../services/mailService.js';
import { StoreSetting } from '../models/Operations.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, conflict, notFound, unauthorized } from '../utils/apiError.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE = 'refreshToken';
const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? 'none' : 'lax',
  path: '/api/auth',
  maxAge: env.jwt.refreshDays * 86400 * 1000,
};

const storeName = async () => (await StoreSetting.findOne({ key: 'store.name' }))?.value || 'The Reading Room';

function publicUser(user) {
  const { password: _p, verificationToken: _v, resetPasswordToken: _r, ...rest } = user.toObject();
  return rest;
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, language, currency } = req.body;
  if (await User.exists({ email })) throw conflict('An account with this email already exists');

  const verificationToken = crypto.randomBytes(20).toString('hex');
  const user = await User.create({
    name, email, password, phone, language, currency, verificationToken,
    verificationExpires: new Date(Date.now() + 24 * 3600 * 1000),
  });

  await sendTemplate(email, 'verify', { name, code: verificationToken, store: await storeName() }, language || 'en');
  await sendTemplate(email, 'welcome', { name, store: await storeName() }, language || 'en');

  const accessToken = signAccess(user._id, 'User');
  const refreshToken = await issueRefresh(user._id, 'User', req);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.status(201).json({ success: true, data: { user: publicUser(user), accessToken } });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw unauthorized('Invalid email or password');
  if (!user.isActive) throw unauthorized('Account is disabled');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const accessToken = signAccess(user._id, 'User');
  const refreshToken = await issueRefresh(user._id, 'User', req);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({ success: true, data: { user: publicUser(user), accessToken } });
});

export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email }).select('+password').populate('role');
  if (!admin) throw unauthorized('Invalid credentials');
  if (admin.lockedUntil && admin.lockedUntil > new Date()) throw unauthorized('Account temporarily locked');
  if (!(await admin.comparePassword(password))) {
    admin.failedLoginAttempts += 1;
    if (admin.failedLoginAttempts >= 5) {
      admin.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      admin.failedLoginAttempts = 0;
    }
    await admin.save({ validateBeforeSave: false });
    throw unauthorized('Invalid credentials');
  }
  if (!admin.isActive) throw unauthorized('Account is disabled');

  admin.failedLoginAttempts = 0;
  admin.lockedUntil = undefined;
  admin.lastLoginAt = new Date();
  await admin.save({ validateBeforeSave: false });

  const accessToken = signAccess(admin._id, 'Admin');
  const refreshToken = await issueRefresh(admin._id, 'Admin', req);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.json({ success: true, data: { admin: { ...admin.toObject(), password: undefined }, accessToken } });
});

export const refresh = asyncHandler(async (req, res) => {
  const rotated = await rotateRefresh(req.cookies?.[REFRESH_COOKIE], req);
  const accessToken = signAccess(rotated.subject, rotated.subjectType);
  res.cookie(REFRESH_COOKIE, rotated.token, cookieOptions);
  res.json({ success: true, data: { accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  await revokeRefresh(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.json({ success: true, message: 'Logged out' });
});

export const me = asyncHandler(async (req, res) => {
  if (req.user) return res.json({ success: true, data: { user: publicUser(req.user), type: 'user' } });
  if (req.admin) {
    const admin = await Admin.findById(req.admin._id).populate('role');
    return res.json({ success: true, data: { user: { ...admin.toObject(), password: undefined }, type: 'admin' } });
  }
  throw unauthorized('Authentication required');
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOne({ verificationToken: req.body.token, verificationExpires: { $gt: new Date() } });
  if (!user) throw badRequest('Invalid or expired verification token');
  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'Email verified' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const customer = await User.findOne({ email });
  const admin = await Admin.findOne({ email });
  const account = customer || admin;
  if (!account) return res.json({ success: true, message: 'If the account exists, a reset link was sent' });

  const token = crypto.randomBytes(32).toString('hex');
  account.resetPasswordToken = token;
  account.resetPasswordExpires = new Date(Date.now() + 3600 * 1000);
  await account.save({ validateBeforeSave: false });

  const url = `${env.clientUrl}/reset-password?token=${token}${admin ? '&admin=1' : ''}`;
  await sendTemplate(email, 'reset', { name: account.name, url, store: await storeName() }, account.language || 'en');
  res.json({ success: true, message: 'If the account exists, a reset link was sent' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const customer = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } }).select('+password');
  const admin = await Admin.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } }).select('+password');
  const account = customer || admin;
  if (!account) throw badRequest('Invalid or expired reset token');

  account.password = password;
  account.resetPasswordToken = undefined;
  account.resetPasswordExpires = undefined;
  await account.save();
  await revokeAllFor(account._id, customer ? 'User' : 'Admin');
  res.json({ success: true, message: 'Password reset successfully' });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'avatar', 'language', 'currency'];
  for (const key of allowed) if (req.body[key] !== undefined) req.user[key] = req.body[key];
  await req.user.save();
  res.json({ success: true, data: publicUser(req.user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const account = req.user || req.admin;
  const fresh = await (req.user ? User : Admin).findById(account._id).select('+password');
  if (!(await fresh.comparePassword(currentPassword))) throw badRequest('Current password is incorrect');
  fresh.password = newPassword;
  await fresh.save();
  await revokeAllFor(fresh._id, req.user ? 'User' : 'Admin');
  res.json({ success: true, message: 'Password changed' });
});
