import { Router } from 'express';

import { getAuthenticatedUser } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/me', authMiddleware, getAuthenticatedUser);

export default router;
