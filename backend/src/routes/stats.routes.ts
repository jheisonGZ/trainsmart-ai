import { Router } from 'express';

import { getProgressStatsController } from '../controllers/stats.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateQuery } from '../middlewares/validate.middleware';
import { statsQuerySchema } from '../validators/stats.schemas';

const router = Router();

router.get('/', authMiddleware, validateQuery(statsQuerySchema), getProgressStatsController);

export default router;
