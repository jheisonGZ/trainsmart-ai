import { Router } from 'express';

import {
  analyzeMyMealController,
  getMyLatestMealAnalysisController,
  listMyMealAnalysesController,
} from '../controllers/nutrition-vision.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody, validateQuery } from '../middlewares/validate.middleware';
import {
  analyzeNutritionSchema,
  nutritionHistoryQuerySchema,
} from '../validators/nutrition-vision.schemas';

const router = Router();

router.get('/latest', authMiddleware, getMyLatestMealAnalysisController);
router.get(
  '/history',
  authMiddleware,
  validateQuery(nutritionHistoryQuerySchema),
  listMyMealAnalysesController,
);
router.post(
  '/analyze',
  authMiddleware,
  validateBody(analyzeNutritionSchema),
  analyzeMyMealController,
);

export default router;
