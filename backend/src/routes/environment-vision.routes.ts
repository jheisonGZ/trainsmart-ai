import { Router } from 'express';

import {
  analyzeMyEnvironmentController,
  getMyLatestEnvironmentAnalysisController,
} from '../controllers/environment-vision.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { analyzeEnvironmentSchema } from '../validators/environment-vision.schemas';

const router = Router();

router.get('/latest', authMiddleware, getMyLatestEnvironmentAnalysisController);
router.post(
  '/analyze',
  authMiddleware,
  validateBody(analyzeEnvironmentSchema),
  analyzeMyEnvironmentController,
);

export default router;
