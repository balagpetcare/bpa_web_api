import { Router, Request, Response, NextFunction } from 'express';
import { CampaignStatus } from '@prisma/client';
import { validate } from '../../middlewares/validate';
import { publicReadLimiter } from '../../middlewares/rateLimiter';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import * as repo from './campaigns.repository';
import { campaignListQuerySchema } from './campaigns.types';

const router = Router();

// Public-safe statuses (excludes draft)
const PUBLIC_STATUSES: CampaignStatus[] = [
  CampaignStatus.published,
  CampaignStatus.registration_open,
  CampaignStatus.registration_closed,
  CampaignStatus.completed,
];

// GET /api/v1/public/campaigns/featured
router.get(
  '/featured',
  publicReadLimiter,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await repo.listFeaturedCampaigns();
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/public/campaigns
router.get(
  '/',
  publicReadLimiter,
  validate(campaignListQuerySchema, 'query'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as never as import('./campaigns.types').CampaignListQuery;
      // Enforce public-safe status filter
      if (!query.status || !PUBLIC_STATUSES.includes(query.status as CampaignStatus)) {
        query.status = undefined; // will be overridden below
      }
      const result = await repo.listCampaigns({
        ...query,
        status: (query.status && PUBLIC_STATUSES.includes(query.status as CampaignStatus))
          ? (query.status as CampaignStatus)
          : undefined,
      });
      // Strip drafts from results
      const items = result.items.filter(c => PUBLIC_STATUSES.includes(c.status as CampaignStatus));
      sendSuccess(res, items, 200, result.meta);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/v1/public/campaigns/:slug
router.get(
  '/:slug',
  publicReadLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaign = await repo.getCampaignBySlug(req.params.slug);
      if (!campaign || !PUBLIC_STATUSES.includes(campaign.status as CampaignStatus)) {
        throw AppError.notFound('Campaign not found');
      }
      sendSuccess(res, campaign);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
