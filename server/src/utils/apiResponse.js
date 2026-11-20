export function sendSuccess(res, { data = null, meta = null, message = null, status = 200 }) {
  const body = { success: true };
  if (message) body.message = message;
  if (data !== null) body.data = data;
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function sendError(res, statusCode, message, details = undefined) {
  const body = { success: false, error: { message } };
  if (details) body.error.details = details;
  return res.status(statusCode).json(body);
}
