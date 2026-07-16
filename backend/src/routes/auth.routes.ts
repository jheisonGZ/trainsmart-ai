import { Router } from 'express';

import { getAuthenticatedUser, getLoginGreetingController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateQuery } from '../middlewares/validate.middleware';
import { loginGreetingQuerySchema } from '../validators/auth.schemas';

const router = Router();

router.get('/me', authMiddleware, getAuthenticatedUser);
router.get(
  '/greeting',
  authMiddleware,
  validateQuery(loginGreetingQuerySchema),
  getLoginGreetingController,
);

export default router;
