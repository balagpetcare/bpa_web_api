import { Router, Request, Response, NextFunction } from 'express';
import { publicReadLimiter } from '../../middlewares/rateLimiter';
import { findRegistrationByBookingRef } from './payments.repository';
import { streamValidationSlipPdf } from './validation-slip.pdf';
import { AppError } from '../../utils/AppError';

const router = Router();

/**
 * GET /api/v1/public/bookings/:bookingRef/validation-slip.pdf
 *
 * Streams a validation slip PDF for any booking regardless of payment status.
 * The PDF shows a prominent PAID / UNPAID / FAILED / etc. banner.
 */
router.get(
  '/:bookingRef/validation-slip.pdf',
  publicReadLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bookingRef } = req.params;
      if (!bookingRef) throw AppError.badRequest('bookingRef is required');

      const reg = await findRegistrationByBookingRef(bookingRef);
      if (!reg) throw AppError.notFound('Booking not found');

      const safeRef = bookingRef.replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="validation-slip-${safeRef}.pdf"`);
      res.setHeader('Cache-Control', 'no-store');

      await streamValidationSlipPdf(reg, res);
    } catch (err) { next(err); }
  },
);

export default router;
