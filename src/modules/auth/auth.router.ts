import { Router } from 'express';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/authenticate';
import { authLoginLimiter, authRefreshLimiter } from '../../middlewares/rateLimiter';
import { loginSchema, refreshSchema } from './auth.types';
import {
  loginHandler,
  refreshHandler,
  logoutHandler,
  meHandler,
} from './auth.controller';

const router = Router();

router.post('/login', authLoginLimiter, validate(loginSchema), loginHandler);
router.post('/refresh', authRefreshLimiter, validate(refreshSchema), refreshHandler);
router.post('/logout', authRefreshLimiter, validate(refreshSchema), logoutHandler);
router.get('/me', authenticate, meHandler);

export default router;
