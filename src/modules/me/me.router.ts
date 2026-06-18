import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { dashboardHandler } from './me.controller';

const router = Router();

router.use(authenticate);

// GET /api/v1/me/dashboard
// Returns the authenticated user's personal impact portal data.
router.get('/dashboard', dashboardHandler);

export default router;
