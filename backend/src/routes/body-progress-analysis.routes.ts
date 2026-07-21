import { Router } from 'express';

import {
  clearBodyProgressAnalysesController,
  createBodyProgressAnalysisController,
  createBodyProgressAnalysisNarrationController,
  listBodyProgressAnalysesController,
} from '../controllers/body-progress-analysis.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadImage } from '../middlewares/upload.middleware';

const router = Router();

router.post('/', authMiddleware, uploadImage, createBodyProgressAnalysisController);
router.get('/', authMiddleware, listBodyProgressAnalysesController);
router.delete('/', authMiddleware, clearBodyProgressAnalysesController);
router.post('/:id/narration', authMiddleware, createBodyProgressAnalysisNarrationController);

export default router;
