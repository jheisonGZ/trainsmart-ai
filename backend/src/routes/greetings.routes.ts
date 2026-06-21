import { Router } from 'express';

import {
  createSpeechAudioController,
  getWelcomeGreetingAudioController,
} from '../controllers/greetings.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { speechAudioSchema } from '../validators/greetings.schemas';

const router = Router();

router.get('/welcome-audio', authMiddleware, getWelcomeGreetingAudioController);
router.post(
  '/speech-audio',
  authMiddleware,
  validateBody(speechAudioSchema),
  createSpeechAudioController,
);

export default router;
