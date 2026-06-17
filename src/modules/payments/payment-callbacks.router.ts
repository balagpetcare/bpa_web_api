import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { prisma } from '../../database/prisma';
import { settlePayment, cancelPaymentRecord } from './payments.service';
import { callbackLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// ─── Merchant TXN ID format ───────────────────────────────────────
// Format: YYYYMMDDHHmmssSSS — exactly 17 digits
const MERCHANT_TXN_ID_RE = /^\d{17}$/;

// All param names any EPS / SSL Commerz variant may send for the txn ID.
const TXN_PARAM_NAMES = [
  'merchantTransactionId',
  'merchantTxnId',
  'txn',
  'transactionId',
  'transaction_id',
  'tran_id',         // SSL Commerz / EPS alternate
  'val_id',          // SSL Commerz validation ID (sometimes 17-digit)
  'mer_txnid',       // EPS alternate
  'epwTxnId',
  'paymentRefId',
  'payment_ref_id',
  'ssl_txn_id',
] as const;

// Param names for a fallback booking / order reference.
// bookingRef is listed first because we embed it directly in callback URLs.
const ORDER_PARAM_NAMES = [
  'bookingRef',
  'bookingReference',
  'booking_ref',
  'value_a',         // EPS custom value (we store booking number here)
  'valueA',          // alternate casing EPS may send back
  'orderId',
  'customerOrderId',
  'reference',
] as const;

// Sensitive fields to mask in logged payloads
const SENSITIVE_KEYS = new Set([
  'password', 'passwd', 'hash', 'hashkey', 'hash_key',
  'signature', 'sign', 'token', 'secret', 'key',
  'card', 'cvv', 'pan',
]);

function maskPayload(query: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(query)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = v;
    }
  }
  return out;
}

function extractMerchantTxnId(query: Request['query']): { txnId: string; paramName: string } | null {
  for (const name of TXN_PARAM_NAMES) {
    const val = query[name];
    if (typeof val === 'string' && MERCHANT_TXN_ID_RE.test(val)) return { txnId: val, paramName: name };
  }
  return null;
}

function extractOrderRef(query: Request['query']): string | null {
  for (const name of ORDER_PARAM_NAMES) {
    const val = query[name];
    if (typeof val === 'string' && val.trim()) return val.trim();
  }
  return null;
}

// ─── Allowed EPS callback IP list ────────────────────────────────
const allowedCallbackIPs: Set<string> = new Set(
  config.EPS_CALLBACK_IPS
    ? config.EPS_CALLBACK_IPS.split(',').map((ip) => ip.trim()).filter(Boolean)
    : [],
);

function requireCallbackIP(req: Request, res: Response, next: NextFunction): void {
  if (allowedCallbackIPs.size === 0) return next();
  const clientIP = req.ip ?? req.socket.remoteAddress ?? '';
  if (!allowedCallbackIPs.has(clientIP)) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  next();
}

// ─── Booking lookup from any available ref ────────────────────────
// Order of priority:
//   1. bookingRef (embedded by us in callback URL) → exact booking number
//   2. value_a / valueA (EPS custom field we set to booking number)
//   3. orderId / customerOrderId → payment UUID → registration
//   4. merchantTxnId (17-digit) → registration
async function findBookingNumber(
  query: Request['query'],
  merchantTxnId?: string,
): Promise<string | null> {
  // 1 + 2: booking number directly in query params
  const directBookingParams = ['bookingRef', 'bookingReference', 'booking_ref', 'value_a', 'valueA'] as const;
  for (const name of directBookingParams) {
    const val = query[name];
    if (typeof val === 'string' && val.trim().startsWith('BPA-')) {
      // Verify it exists
      const reg = await prisma.campaignRegistration.findUnique({
        where: { bookingNumber: val.trim() },
        select: { bookingNumber: true },
      });
      if (reg) return reg.bookingNumber;
    }
  }

  // 3: order/customer ID is a payment UUID
  const paymentUuidParams = ['customerOrderId', 'orderId', 'value_b', 'valueB'] as const;
  for (const name of paymentUuidParams) {
    const val = query[name];
    if (typeof val === 'string' && /^[0-9a-f-]{36}$/i.test(val)) {
      const reg = await prisma.campaignRegistration.findFirst({
        where: { paymentId: val.trim() },
        select: { bookingNumber: true },
      });
      if (reg) return reg.bookingNumber;
    }
  }

  // 4: via merchant txn ID
  if (merchantTxnId) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { merchantTxnId },
        select: { id: true, entityType: true, purpose: true },
      });
      if (!payment) return null;
      const isCampaign = payment.entityType === 'campaign' || payment.purpose?.startsWith('campaign');
      if (!isCampaign) return null;
      const reg = await prisma.campaignRegistration.findFirst({
        where: { paymentId: payment.id },
        select: { bookingNumber: true },
      });
      return reg?.bookingNumber ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

// ─── Mark a pending payment as pending_review ─────────────────────
// Called in the missing-txn path so the admin can verify manually.
async function markPendingReviewByBookingNumber(bookingNumber: string): Promise<void> {
  try {
    const reg = await prisma.campaignRegistration.findUnique({
      where: { bookingNumber },
      select: { paymentId: true },
    });
    if (!reg?.paymentId) return;
    const payment = await prisma.payment.findUnique({
      where: { id: reg.paymentId },
      select: { id: true, status: true },
    });
    if (!payment || payment.status !== 'pending') return;
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'pending_review', payload: { markedVia: 'missing_txn_callback', markedAt: new Date().toISOString() } as never },
    });
  } catch {
    // Never crash the callback flow
  }
}

function deriveCallbackType(path: string): string {
  if (path.includes('success')) return 'success';
  if (path.includes('fail')) return 'fail';
  if (path.includes('cancel')) return 'cancel';
  return 'unknown';
}

async function logCallbackAttempt(opts: {
  callbackType: string;
  merchantTxnId: string | null;
  outcome: string;
  ipAddress: string | null;
  userAgent: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: 'create',
        resource: 'payment_callback',
        resourceId: opts.merchantTxnId ?? undefined,
        newValues: {
          callbackType: opts.callbackType,
          outcome: opts.outcome,
          payload: opts.payload ?? null,
        } as never,
        ipAddress: opts.ipAddress ?? undefined,
        userAgent: opts.userAgent ?? undefined,
      },
    });
  } catch {
    // Audit log failure must never crash the callback flow
  }
}

// ─── merchantTxnId validation middleware ─────────────────────────
function validateMerchantTxnId(req: Request, res: Response, next: NextFunction): void {
  const found = extractMerchantTxnId(req.query);

  if (!found) {
    const callbackType = deriveCallbackType(req.path);
    const masked = maskPayload(req.query as Record<string, unknown>);
    console.warn(
      `[EPS callback:${callbackType}] No valid 17-digit merchantTxnId. ` +
      `Keys: ${Object.keys(req.query).join(', ') || '(none)'} | ` +
      `Payload: ${JSON.stringify(masked)}`,
    );

    // Try to recover booking from any available ref in the payload
    const orderRef = extractOrderRef(req.query);

    // Fire async recovery: mark as pending_review + redirect with booking=
    void (async () => {
      let bookingNumber: string | null = null;
      try {
        bookingNumber = await findBookingNumber(req.query);
        if (bookingNumber) {
          await markPendingReviewByBookingNumber(bookingNumber);
        }
      } catch { /* recovery failure must not affect redirect */ }

      void logCallbackAttempt({
        callbackType,
        merchantTxnId: null,
        outcome: bookingNumber ? 'missing_txn_booking_found' : 'rejected_invalid_id',
        ipAddress: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
        payload: masked,
      });

      const bookingQs = bookingNumber ? `&booking=${encodeURIComponent(bookingNumber)}` : '';
      const refQs     = !bookingNumber && orderRef ? `&ref=${encodeURIComponent(orderRef)}` : '';
      res.redirect(`${config.FRONTEND_URL}/payment/failed?reason=missing_txn${bookingQs}${refQs}`);
    })();
    return;
  }

  if (found.paramName !== 'merchantTransactionId') {
    console.log(`[EPS callback] TXN ID in non-standard param "${found.paramName}" — normalizing`);
  }
  req.query.merchantTransactionId = found.txnId;
  next();
}

// ─── Apply global middlewares ─────────────────────────────────────
router.use(callbackLimiter);
router.use(requireCallbackIP);

// ─── Success callback ─────────────────────────────────────────────
router.get('/callback/success', validateMerchantTxnId, async (req: Request, res: Response) => {
  const merchantTxnId = req.query.merchantTransactionId as string;
  const masked = maskPayload(req.query as Record<string, unknown>);
  console.log(`[EPS callback:success] txn=${merchantTxnId} | Payload: ${JSON.stringify(masked)}`);

  try {
    const [status, bookingNumber] = await Promise.all([
      settlePayment(merchantTxnId),
      findBookingNumber(req.query, merchantTxnId),
    ]);

    void logCallbackAttempt({
      callbackType: 'success',
      merchantTxnId,
      outcome: status === 'success' ? 'settled_success' : `settled_${status}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      payload: masked,
    });

    const bookingQs = bookingNumber ? `&booking=${encodeURIComponent(bookingNumber)}` : '';
    if (status === 'success') {
      return res.redirect(`${config.FRONTEND_URL}/payment/success?txn=${merchantTxnId}${bookingQs}`);
    }
    return res.redirect(
      `${config.FRONTEND_URL}/payment/failed?txn=${merchantTxnId}&reason=verification_failed${bookingQs}`,
    );
  } catch {
    void logCallbackAttempt({
      callbackType: 'success',
      merchantTxnId,
      outcome: 'error',
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
      payload: masked,
    });
    // Best-effort booking number for the error redirect
    const bookingNumber = await findBookingNumber(req.query, merchantTxnId).catch(() => null);
    const bookingQs = bookingNumber ? `&booking=${encodeURIComponent(bookingNumber)}` : '';
    return res.redirect(`${config.FRONTEND_URL}/payment/failed?reason=error${bookingQs}`);
  }
});

// ─── Fail callback ────────────────────────────────────────────────
router.get('/callback/fail', validateMerchantTxnId, async (req: Request, res: Response) => {
  const merchantTxnId = req.query.merchantTransactionId as string;
  const masked = maskPayload(req.query as Record<string, unknown>);
  console.log(`[EPS callback:fail] txn=${merchantTxnId} | Payload: ${JSON.stringify(masked)}`);

  const [status, bookingNumber] = await Promise.all([
    settlePayment(merchantTxnId).catch(() => 'failed' as const),
    findBookingNumber(req.query, merchantTxnId),
  ]);

  void logCallbackAttempt({
    callbackType: 'fail',
    merchantTxnId,
    outcome: `received_fail_settled_${status}`,
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
    payload: masked,
  });

  const bookingQs = bookingNumber ? `&booking=${encodeURIComponent(bookingNumber)}` : '';
  const reason = status === 'cancelled' ? 'cancelled' : 'payment_failed';
  return res.redirect(
    `${config.FRONTEND_URL}/payment/failed?txn=${merchantTxnId}&reason=${reason}${bookingQs}`,
  );
});

// ─── Cancel callback ──────────────────────────────────────────────
// User explicitly cancelled at the gateway — mark directly without EPS re-verify.
router.get('/callback/cancel', validateMerchantTxnId, async (req: Request, res: Response) => {
  const merchantTxnId = req.query.merchantTransactionId as string;
  const masked = maskPayload(req.query as Record<string, unknown>);
  console.log(`[EPS callback:cancel] txn=${merchantTxnId} | Payload: ${JSON.stringify(masked)}`);

  const [, bookingNumber] = await Promise.all([
    cancelPaymentRecord(merchantTxnId).catch(() => null),
    findBookingNumber(req.query, merchantTxnId),
  ]);

  void logCallbackAttempt({
    callbackType: 'cancel',
    merchantTxnId,
    outcome: 'received_cancel',
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
    payload: masked,
  });

  const bookingQs = bookingNumber ? `&booking=${encodeURIComponent(bookingNumber)}` : '';
  return res.redirect(
    `${config.FRONTEND_URL}/payment/failed?txn=${merchantTxnId}&reason=cancelled${bookingQs}`,
  );
});

export default router;
