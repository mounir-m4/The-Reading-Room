export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const badRequest = (msg, details) => new ApiError(400, msg, details);
export const unauthorized = (msg = 'Unauthorized') => new ApiError(401, msg);
export const forbidden = (msg = 'Forbidden') => new ApiError(403, msg);
export const notFound = (msg = 'Resource not found') => new ApiError(404, msg);
export const conflict = (msg = 'Conflict') => new ApiError(409, msg);
export const tooMany = (msg = 'Too many requests') => new ApiError(429, msg);
