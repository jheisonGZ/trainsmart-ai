import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { ApiErrorResponse, ApiSuccessResponse } from '../types/common.types';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Resource already exists') {
    super(409, message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(422, message, details);
    this.name = 'ValidationError';
  }
}

export class PreconditionFailedError extends ApiError {
  constructor(message = 'Precondition failed') {
    super(412, message);
    this.name = 'PreconditionFailedError';
  }
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200) {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  details?: unknown,
) {
  const payload: ApiErrorResponse = {
    success: false,
    error: message,
    ...(details !== undefined ? { details } : {}),
  };

  return res.status(statusCode).json(payload);
}

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}
