import { Router, Request, Response, NextFunction } from 'express';
import { CampaignStatus } from '@prisma/client';
import { validate } from '../../middlewares/validate';
import { publicReadLimiter } from '../../middlewares/rateLimiter';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import * as repo from './campaigns.repository';
import { campaignListQuerySchema } from './campaigns.types';

const router = Router();

// All statuses visible to the public (excludes draft/cancelled)
const PUBLIC_STATUSES: CampaignStatus[] = [
  CampaignStatus.published,
  CampaignStatus.registration_open,
  CampaignStatus.registration_closed,
  CampaignStatus.completed,
];

// Default listing shows only actively open/upcoming campaigns
const ACTIVE_PUBLIC_STATUSES: CampaignStatus[] = [
  CampaignStatus.published,
  CampaignStatus.registration_open,
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
      const now = new Date();
      const query = req.query as never as import('./campaigns.types').CampaignListQuery;
      const requestedStatus = (query.status && PUBLIC_STATUSES.includes(query.status as CampaignStatus))
        ? (query.status as CampaignStatus)
        : undefined;

      const result = await repo.listCampaigns({ ...query, status: requestedStatus });

      let items = result.items.filter(c => PUBLIC_STATUSES.includes(c.status as CampaignStatus));

      if (!requestedStatus) {
        // Default: only show active/upcoming campaigns, filter out expired registration windows
        items = items.filter(c =>
          ACTIVE_PUBLIC_STATUSES.includes(c.status as CampaignStatus) &&
          (c.registrationCloseAt === null || new Date(c.registrationCloseAt) > now),
        );
      } else if (requestedStatus === CampaignStatus.registration_open) {
        // Even when explicitly filtering registration_open, exclude expired windows
        items = items.filter(c =>
          c.registrationCloseAt === null || new Date(c.registrationCloseAt) > now,
        );
      }

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
