import { Router } from 'express';

import {
  generateRoutineAudioController,
  getRoutineAudioController,
} from '../controllers/routine-audio.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateParams } from '../middlewares/validate.middleware';
import { sessionIdParamSchema } from '../validators/sessions.schemas';

const router = Router();

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

export default router;
