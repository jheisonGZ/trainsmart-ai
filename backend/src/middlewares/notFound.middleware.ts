import type { Request, Response } from 'express';

import { sendError } from '../utils/api-response';

export function notFoundMiddleware(req: Request, res: Response) {
  sendError(res, `Route ${req.method} ${req.originalUrl} not found.`, 404);
}
