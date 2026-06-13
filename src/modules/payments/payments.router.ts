import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { authorize } from '../../middlewares/authorize';
import { RESOURCES, ACTIONS } from '../../config/constants';
import { sendSuccess } from '../../utils/response';
import { syncPayment, listPayments, getPayment } from './payments.service';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(RESOURCES.PAYMENTS, ACTIONS.READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items, meta } = await listPayments(req.query as never);
      sendSuccess(res, items, 200, meta);
    } catch (e) { next(e); }
  },
);

router.get(
  '/:id',
  authorize(RESOURCES.PAYMENTS, ACTIONS.READ),
  async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await getPayment(req.params.id)); } catch (e) { next(e); }
  },
);

router.post(
  '/:id/sync',
  authorize(RESOURCES.PAYMENTS, ACTIONS.UPDATE),
  async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await syncPayment(req.params.id)); } catch (e) { next(e); }
  },
);

export default router;
