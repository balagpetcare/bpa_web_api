import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { sendSuccess } from '../../utils/response';
import { publicReadLimiter } from '../../middlewares/rateLimiter';
import { RESOURCES, ACTIONS } from '../../config/constants';
import { getDashboardStats, getPublicOverview } from './community-fund.repository';

const adminRouter = Router();
adminRouter.use(authenticate);

adminRouter.get('/dashboard', authorize(RESOURCES.COMMUNITY_FUND_DASHBOARD, ACTIONS.READ), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getDashboardStats());
  } catch (err) { next(err); }
});

const publicRouter = Router();
publicRouter.get('/overview', publicReadLimiter, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await getPublicOverview());
  } catch (err) { next(err); }
});

export { adminRouter as communityFundAdminRouter, publicRouter as communityFundPublicRouter };

