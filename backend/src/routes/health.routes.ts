import type { RequestHandler } from 'express';
import { Router } from 'express';

import {
  createMyHealthHistoryController,
  getMyHealthHistoryController,
  updateMyHealthHistoryController,
} from '../controllers/health.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { healthHistorySchema } from '../validators/health.schemas';
import { normalizeHealthPayload } from '../utils/sanitize';

const router = Router();

const normalizeHealthBody: RequestHandler = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = normalizeHealthPayload(req.body as Record<string, unknown>);
  }

  next();
};

router.get('/me', authMiddleware, getMyHealthHistoryController);
router.post(
  '/me',
  authMiddleware,
  normalizeHealthBody,
  validateBody(healthHistorySchema),
  createMyHealthHistoryController,
);
router.put(
  '/me',
  authMiddleware,
  normalizeHealthBody,
  validateBody(healthHistorySchema),
  updateMyHealthHistoryController,
);

export default router;
