import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { logger } from '../lib/logger';
import { ApiError, sendError } from '../utils/api-response';
import { sanitizeForLog } from '../utils/sanitize';

interface PostgresLikeError {
  code?: string;
  message?: string;
  details?: unknown;
}

function isPostgresLikeError(error: unknown): error is PostgresLikeError {
  return typeof error === 'object' && error !== null && 'code' in error;
}

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (res.headersSent) {
    return;
  }

  if (error instanceof ZodError) {
    sendError(res, 'Validation error', 400, error.flatten());
    return;
  }

  if (error instanceof ApiError) {
    logger.warn('Handled API error', {
      path: req.path,
      method: req.method,
      statusCode: error.statusCode,
      message: error.message,
      details: sanitizeForLog(error.details),
    });

    sendError(res, error.message, error.statusCode, error.details);
    return;
  }

  if (isPostgresLikeError(error)) {
    if (error.code === '23505') {
      sendError(res, 'Resource already exists.', 409, error.details);
      return;
    }

    if (error.code === '23503') {
      sendError(res, 'Referenced resource was not found.', 404, error.details);
      return;
    }

    if (error.code === '23514') {
      sendError(res, 'Database constraint violation.', 400, error.details);
      return;
    }

    if (error.code === 'PGRST116') {
      sendError(res, 'Resource not found.', 404);
      return;
    }
  }

  logger.error('Unhandled application error', {
    path: req.path,
    method: req.method,
    error: sanitizeForLog(error),
  });

  sendError(res, 'Internal server error.', 500);
}
