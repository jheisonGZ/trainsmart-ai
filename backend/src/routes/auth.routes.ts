import { Router } from 'express';

import {
  getAuthenticatedUser,
  getLoginGreetingController,
  getLogoutFarewellController,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validateQuery } from '../middlewares/validate.middleware';
import { loginGreetingQuerySchema, logoutFarewellQuerySchema } from '../validators/auth.schemas';

const router = Router();

router.get('/me', authMiddleware, getAuthenticatedUser);
router.get(
  '/greeting',
  authMiddleware,
  validateQuery(loginGreetingQuerySchema),
  getLoginGreetingController,
);
router.get(
  '/farewell',
  authMiddleware,
  validateQuery(logoutFarewellQuerySchema),
  getLogoutFarewellController,
);

export default router;
