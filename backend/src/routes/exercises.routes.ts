import { Router } from 'express';

import {
  getExerciseController,
  getExerciseGifController,
  getExerciseMediaController,
  listExercisesController,
} from '../controllers/exercises.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateParams, validateQuery } from '../middlewares/validate.middleware';
import {
  exerciseGifQuerySchema,
  exerciseIdParamSchema,
  exerciseQuerySchema,
} from '../validators/exercises.schemas';

const router = Router();

router.get('/', authMiddleware, validateQuery(exerciseQuerySchema), listExercisesController);
router.get(
  '/gif',
  authMiddleware,
  validateQuery(exerciseGifQuerySchema),
  getExerciseGifController,
);
router.get(
  '/:id/media',
  authMiddleware,
  validateParams(exerciseIdParamSchema),
  getExerciseMediaController,
);
router.get('/:id', authMiddleware, validateParams(exerciseIdParamSchema), getExerciseController);

export default router;
