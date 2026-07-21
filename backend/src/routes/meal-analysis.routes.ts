import { Router } from 'express';

import {
  clearMealAnalysesController,
  createMealAnalysisController,
  createMealAnalysisNarrationController,
  listMealAnalysesController,
} from '../controllers/meal-analysis.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadImage } from '../middlewares/upload.middleware';

const router = Router();

router.post('/', authMiddleware, uploadImage, createMealAnalysisController);
router.get('/', authMiddleware, listMealAnalysesController);
router.delete('/', authMiddleware, clearMealAnalysesController);
router.post('/:id/narration', authMiddleware, createMealAnalysisNarrationController);

export default router;
