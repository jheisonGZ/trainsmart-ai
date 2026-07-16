import { Router } from 'express';

import {
  addSessionExerciseController,
  clearMySessionsController,
  createMySessionController,
  finishMySessionController,
  getMySessionController,
  listMySessionsController,
} from '../controllers/sessions.controller';
import {
  generateRoutineAudioController,
  getRoutineAudioController,
} from '../controllers/routine-audio.controller';
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
router.delete('/me', authMiddleware, clearMySessionsController);
router.post('/', authMiddleware, validateBody(createSessionSchema), createMySessionController);
router.post(
  '/:sessionId/audio',
  authMiddleware,
  validateParams(sessionIdParamSchema),
  generateRoutineAudioController,
);
router.get(
  '/:sessionId/audio',
  authMiddleware,
  validateParams(sessionIdParamSchema),
  getRoutineAudioController,
);
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
