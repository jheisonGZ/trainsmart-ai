import { Router } from 'express';

import {
  clearEnvironmentAnalysesController,
  createEnvironmentAnalysisController,
  listEnvironmentAnalysesController,
} from '../controllers/environment-analysis.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadImage } from '../middlewares/upload.middleware';

const router = Router();

router.post('/', authMiddleware, uploadImage, createEnvironmentAnalysisController);
router.get('/', authMiddleware, listEnvironmentAnalysesController);
router.delete('/', authMiddleware, clearEnvironmentAnalysesController);

export default router;
