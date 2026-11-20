import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  const copy = { ...body };
  for (const key of ['password', 'token', 'secret', 'cardNumber', 'cvc']) {
    if (key in copy) copy[key] = '[REDACTED]';
  }
  return copy;
};

export function notFoundHandler(req, res) {
  return sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found`);
}

export function errorHandler(err, req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err instanceof ZodError) {
    status = 400;
    message = 'Validation failed';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err?.code === 11000) {
    status = 409;
    message = 'A record with this value already exists';
    details = { field: Object.keys(err.keyPattern || {})[0] };
  } else if (err?.name === 'JsonWebTokenError' || err?.name === 'TokenExpiredError') {
    status = 401;
    message = 'Invalid or expired token';
  }

  if (status >= 500) {
    logger.error(err.message, { url: req.originalUrl, body: sanitizeBody(req.body) });
  }

  return sendError(res, status, message, details);
}
