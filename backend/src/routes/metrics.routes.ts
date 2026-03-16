import type { RequestHandler } from 'express';
import { Router } from 'express';

import {
  createMyBodyMetricController,
  getMyBodyMetricsController,
} from '../controllers/metrics.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import { bodyMetricSchema, metricQuerySchema } from '../validators/health.schemas';
import { normalizeMetricPayload } from '../utils/sanitize';

const router = Router();

const normalizeMetricBody: RequestHandler = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = normalizeMetricPayload(req.body as Record<string, unknown>);
  }

  next();
};

router.get('/me', authMiddleware, validateQuery(metricQuerySchema), getMyBodyMetricsController);
router.post(
  '/me',
  authMiddleware,
  normalizeMetricBody,
  validateBody(bodyMetricSchema),
  createMyBodyMetricController,
);

export default router;
