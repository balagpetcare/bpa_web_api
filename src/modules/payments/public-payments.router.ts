import { Router, Request, Response, NextFunction } from 'express';
import { publicReadLimiter } from '../../middlewares/rateLimiter';
import { sendSuccess } from '../../utils/response';
import { getPublicPaymentStatus } from './payments.service';
import { AppError } from '../../utils/AppError';

const router = Router();

/**
 * GET /api/v1/public/payments/status
 *
 * Query params (at least one required):
 *   bookingRef  — BPA-BK-YYYYMMDD-##### format
 *   paymentRef  — 17-digit merchantTxnId or payment UUID
 *
 * Returns booking + payment status safe for public display.
 * Does NOT return full owner info — only masked phone and campaign title.
 */
router.get(
  '/status',
  publicReadLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bookingRef = typeof req.query.bookingRef === 'string' ? req.query.bookingRef.trim() : undefined;
      const paymentRef = typeof req.query.paymentRef === 'string' ? req.query.paymentRef.trim() : undefined;

      if (!bookingRef && !paymentRef) {
        throw AppError.badRequest('Provide bookingRef or paymentRef query parameter');
      }

      const result = await getPublicPaymentStatus({ bookingRef, paymentRef });
      if (!result) {
        throw AppError.notFound('Booking or payment not found');
      }

      sendSuccess(res, result);
    } catch (err) { next(err); }
  },
);

export default router;
