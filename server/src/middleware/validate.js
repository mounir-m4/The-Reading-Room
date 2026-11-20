import { badRequest } from '../utils/apiError.js';

/** Zod schema validator targeting a chosen part of the request. */
function coerceMultipart(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
}

export const validate = (schema, source = 'body') => (req, _res, next) => {
  if (req.is?.('multipart/form-data')) {
    for (const [key, value] of Object.entries(req[source] || {})) {
      req[source][key] = coerceMultipart(value);
    }
  }
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return next(badRequest('Validation failed', details));
  }
  req[source] = result.data;
  next();
};
