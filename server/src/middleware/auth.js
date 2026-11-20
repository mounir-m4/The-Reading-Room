import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Admin } from '../models/Admin.js';
import { Role } from '../models/Role.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { forbidden, unauthorized } from '../utils/apiError.js';

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
};

const loadIdentity = async (payload) => {
  if (!payload?.sub) return null;
  if (payload.subjectType === 'Admin') {
    const admin = await Admin.findById(payload.sub).populate('role').select('+password');
    return admin?.isActive ? { admin, user: null } : null;
  }
  const user = await User.findById(payload.sub).select('+password');
  return user?.isActive ? { user, admin: null } : null;
};

/**
 * Flexible auth: accepts customer or admin access tokens.
 * Places `req.user` and/or `req.admin` when available.
 */
export const protect = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw unauthorized('Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.accessSecret);
  } catch {
    throw unauthorized('Invalid or expired token');
  }

  const identity = await loadIdentity(payload);
  if (!identity) throw unauthorized('Account unavailable');

  req.user = identity.user;
  req.admin = identity.admin;
  req.auth = { subjectType: payload.subjectType, id: payload.sub };
  next();
});

/**
 * Attaches an identity when a valid token is present, but allows the request
 * to continue as a guest otherwise. Used by mixed guest/authenticated routes
 * such as cart, wishlist and checkout.
 */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    const identity = await loadIdentity(payload);
    if (identity) {
      req.user = identity.user;
      req.admin = identity.admin;
      req.auth = { subjectType: payload.subjectType, id: payload.sub };
    }
  } catch {
    // Invalid or expired tokens are treated as guest access on optional routes.
  }
  return next();
});

export const customerOnly = asyncHandler(async (req, _res, next) => {
  if (!req.user) throw forbidden('Customer account required');
  next();
});

export const adminOnly = asyncHandler(async (req, _res, next) => {
  if (!req.admin) throw forbidden('Administrator account required');
  next();
});

/** Backend-enforced permission check: authorize('books.create', ...) */
export const authorize = (...permissions) => asyncHandler(async (req, _res, next) => {
  if (!req.admin) throw forbidden('Administrator account required');
  const role = req.admin.role || (await Role.findById(req.admin.role));
  const owned = role?.permissions || [];
  if (role?.name === 'Super Admin') return next();
  if (!permissions.every((p) => owned.includes(p))) {
    throw forbidden(`Missing permission: ${permissions.join(', ')}`);
  }
  next();
});

/** Allow either an authenticated owner or an admin with permission. */
export const ownerOrAdmin = (permission) => asyncHandler(async (req, _res, next) => {
  const isOwner = req.user && req.user.id === req.params.id;
  if (isOwner) return next();
  if (!req.admin) throw forbidden('Not allowed');
  if (req.admin.role?.name === 'Super Admin') return next();
  if (!req.admin.role?.permissions?.includes(permission)) throw forbidden('Missing permission');
  next();
});
