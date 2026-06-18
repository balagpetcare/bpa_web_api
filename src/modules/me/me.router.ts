import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { dashboardHandler, updateProfileHandler } from './me.controller';

const router = Router();

router.use(authenticate);

// GET /api/v1/me/dashboard
router.get('/dashboard', dashboardHandler);

// PATCH /api/v1/me/profile
router.patch('/profile', updateProfileHandler);

export default router;
