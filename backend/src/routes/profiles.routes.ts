import type { RequestHandler } from 'express';
import { Router } from 'express';

import {
  confirmMyProfileController,
  createMyProfileController,
  getMyProfileController,
  updateMyProfileController,
} from '../controllers/profiles.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createProfileSchema,
  updateProfileSchema,
} from '../validators/profiles.schemas';
import { normalizeProfilePayload } from '../utils/sanitize';

const router = Router();

const normalizeProfileBody: RequestHandler = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = normalizeProfilePayload(req.body as Record<string, unknown>);
  }

  next();
};

router.get('/me', authMiddleware, getMyProfileController);
router.post(
  '/me',
  authMiddleware,
  normalizeProfileBody,
  validateBody(createProfileSchema),
  createMyProfileController,
);
router.put(
  '/me',
  authMiddleware,
  normalizeProfileBody,
  validateBody(updateProfileSchema),
  updateMyProfileController,
);
router.post('/me/confirm', authMiddleware, confirmMyProfileController);

export default router;
