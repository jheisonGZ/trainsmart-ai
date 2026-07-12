import { Router } from 'express';

import {
  analyzeMyBodyProgressController,
  getMyLatestBodyProgressEntryController,
  listMyBodyProgressEntriesController,
  reanalyzeMyLatestBodyProgressController,
} from '../controllers/body-progress-vision.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import {
  analyzeBodyProgressSchema,
  bodyProgressHistoryQuerySchema,
} from '../validators/body-progress-vision.schemas';

const router = Router();

router.get('/latest', authMiddleware, getMyLatestBodyProgressEntryController);
router.get(
  '/history',
  authMiddleware,
  validateQuery(bodyProgressHistoryQuerySchema),
  listMyBodyProgressEntriesController,
);
router.post(
  '/analyze',
  authMiddleware,
  validateBody(analyzeBodyProgressSchema),
  analyzeMyBodyProgressController,
);
router.post('/reanalyze', authMiddleware, reanalyzeMyLatestBodyProgressController);

export default router;
