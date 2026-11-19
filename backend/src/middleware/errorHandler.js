import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { sendError } from '../utils/response.js';
import { env } from '../config/env.js';

export const notFoundHandler = (req, res) => {
  return sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 400, 'Validation failed', errors);
  }

  if (err instanceof ApiError) {
    return sendError(res, err.statusCode, err.message, err.errors);
  }

  if (err instanceof mongoose.Error.CastError) {
    return sendError(res, 400, 'Invalid identifier', [{ path: err.path, message: err.message }]);
  }

  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {});
    return sendError(res, 409, 'Duplicate key conflict', [
      { path: fields.join(','), message: 'Resource already exists' },
    ]);
  }

  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'Token expired');
  }

  if (!env.isProduction) {
    console.error(err);
  }

  return sendError(res, 500, 'Internal server error');
};
