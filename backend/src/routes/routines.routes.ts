import { Router } from 'express';

import {
  approveRoutineVersionController,
  discardRoutineVersionController,
  generateRoutineController,
  getCurrentRoutineDashboardController,
  getCurrentRoutineTodayController,
  getMyRoutineController,
  getMyRoutineVersionController,
  getMyRoutineVersionsController,
  listMyRoutinesController,
  regenerateRoutineController,
} from '../controllers/routines.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  validateBody,
  validateParams,
  validateQuery,
} from '../middlewares/validate.middleware';
import {
  routineGenerateSchema,
  routineIdParamSchema,
  routineRegenerateSchema,
  todayQuerySchema,
  versionIdParamSchema,
} from '../validators/routines.schemas';

const router = Router();

router.get('/me', authMiddleware, listMyRoutinesController);
router.get('/current/dashboard', authMiddleware, getCurrentRoutineDashboardController);
router.get(
  '/current/today',
  authMiddleware,
  validateQuery(todayQuerySchema),
  getCurrentRoutineTodayController,
);
router.post(
  '/generate',
  authMiddleware,
  validateBody(routineGenerateSchema),
  generateRoutineController,
);
router.get(
  '/versions/:versionId',
  authMiddleware,
  validateParams(versionIdParamSchema),
  getMyRoutineVersionController,
);
router.post(
  '/versions/:versionId/approve',
  authMiddleware,
  validateParams(versionIdParamSchema),
  approveRoutineVersionController,
);
router.post(
  '/versions/:versionId/discard',
  authMiddleware,
  validateParams(versionIdParamSchema),
  discardRoutineVersionController,
);
router.get(
  '/:routineId/versions',
  authMiddleware,
  validateParams(routineIdParamSchema),
  getMyRoutineVersionsController,
);
router.post(
  '/:routineId/regenerate',
  authMiddleware,
  validateParams(routineIdParamSchema),
  validateBody(routineRegenerateSchema),
  regenerateRoutineController,
);
router.get(
  '/:routineId',
  authMiddleware,
  validateParams(routineIdParamSchema),
  getMyRoutineController,
);

export default router;
