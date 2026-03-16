import { Router } from 'express';

import {
  addSessionExerciseController,
  createMySessionController,
  finishMySessionController,
  getMySessionController,
  listMySessionsController,
} from '../controllers/sessions.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middlewares/validate.middleware';
import {
  createSessionSchema,
  finishSessionSchema,
  sessionExerciseSchema,
  sessionIdParamSchema,
  sessionListQuerySchema,
} from '../validators/sessions.schemas';

const router = Router();

router.get('/me', authMiddleware, validateQuery(sessionListQuerySchema), listMySessionsController);
router.post('/', authMiddleware, validateBody(createSessionSchema), createMySessionController);
router.get(
  '/:sessionId',
  authMiddleware,
  validateParams(sessionIdParamSchema),
  getMySessionController,
);
router.post(
  '/:sessionId/exercises',
  authMiddleware,
  validateParams(sessionIdParamSchema),
  validateBody(sessionExerciseSchema),
  addSessionExerciseController,
);
router.put(
  '/:sessionId/finish',
  authMiddleware,
  validateParams(sessionIdParamSchema),
  validateBody(finishSessionSchema),
  finishMySessionController,
);

export default router;
