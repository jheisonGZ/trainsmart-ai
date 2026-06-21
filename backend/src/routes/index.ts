import { Router } from 'express';

import { getHealthCheckController } from '../controllers/stats.controller';
import authRoutes from './auth.routes';
import exercisesRoutes from './exercises.routes';
import greetingsRoutes from './greetings.routes';
import healthRoutes from './health.routes';
import metricsRoutes from './metrics.routes';
import profilesRoutes from './profiles.routes';
import progressRoutes from './progress.routes';
import routinesRoutes from './routines.routes';
import sessionsRoutes from './sessions.routes';
import statsRoutes from './stats.routes';
import workoutSessionAudioRoutes from './workout-session-audio.routes';

const router = Router();

router.get('/health', getHealthCheckController);
router.use('/auth', authRoutes);
router.use('/greetings', greetingsRoutes);
router.use('/profiles', profilesRoutes);
router.use('/health-history', healthRoutes);
router.use('/body-metrics', metricsRoutes);
router.use('/exercises', exercisesRoutes);
router.use('/routines', routinesRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/workout-sessions', workoutSessionAudioRoutes);
router.use('/progress', progressRoutes);
router.use('/stats', statsRoutes);

export default router;
