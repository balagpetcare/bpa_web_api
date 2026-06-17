import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { prisma } from '../../database/prisma';
import { settlePayment, cancelPaymentRecord } from './payments.service';
import { callbackLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// ─── Merchant TXN ID format ───────────────────────────────────────
// Format: YYYYMMDDHHmmssSSS — exactly 17 digits
const MERCHANT_TXN_ID_RE = /^\d{17}$/;

// All param names EPS may use for the merchant transaction ID.
const TXN_PARAM_NAMES = [
  'merchantTransactionId',
  'merchantTxnId',
  'txn',
  'transactionId',
  'transaction_id',
  'epwTxnId',
  'paymentRefId',
  'payment_ref_id',
] as const;

// Param names that may carry a fallback order/reference ID
const ORDER_PARAM_NAMES = [
  'orderId',
  'customerOrderId',
  'reference',
  'bookingRef',
] as const;

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

// ─── merchantTxnId validation middleware ─────────────────────────
function validateMerchantTxnId(req: Request, res: Response, next: NextFunction): void {
  const found = extractMerchantTxnId(req.query);

  if (!found) {
    const receivedKeys = Object.keys(req.query).join(', ') || '(none)';
    console.warn(`[EPS callback] No valid merchant transaction ID. Path: ${req.path} | Keys: ${receivedKeys}`);
    void logCallbackAttempt({
      callbackType: deriveCallbackType(req.path),
      merchantTxnId: null,
      outcome: 'rejected_invalid_id',
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    const orderRef = extractOrderRef(req.query);
    const qs = orderRef ? `?reason=missing_txn&ref=${encodeURIComponent(orderRef)}` : '?reason=missing_txn';
    res.redirect(`${config.FRONTEND_URL}/payment/failed${qs}`);
    return;
  }

  if (found.paramName !== 'merchantTransactionId') {
    console.log(`[EPS callback] TXN ID in non-standard param "${found.paramName}" — normalizing`);
  }
  req.query.merchantTransactionId = found.txnId;
  next();
}

// ─── Booking number lookup ────────────────────────────────────────
// Bug fix: payment is created with entityType='campaign', but purpose='campaign_registration'.
// Lookup by entityType (not purpose) to correctly find campaign bookings.
async function getBookingNumberForTxn(merchantTxnId: string): Promise<string | null> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { merchantTxnId },
      select: { id: true, entityType: true, purpose: true },
    });
    if (!payment) return null;
    // Accept either entityType='campaign' OR purpose starting with 'campaign'
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
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: 'create',
        resource: 'payment_callback',
        resourceId: opts.merchantTxnId ?? undefined,
        newValues: { callbackType: opts.callbackType, outcome: opts.outcome },
        ipAddress: opts.ipAddress ?? undefined,
        userAgent: opts.userAgent ?? undefined,
      },
    });
  } catch {
    // Audit log failure must never crash the callback flow
  }
}

// ─── Apply global middlewares ─────────────────────────────────────
router.use(callbackLimiter);
router.use(requireCallbackIP);

// ─── Success callback ─────────────────────────────────────────────
router.get('/callback/success', validateMerchantTxnId, async (req: Request, res: Response) => {
  const merchantTxnId = req.query.merchantTransactionId as string;
  try {
    const [status, bookingNumber] = await Promise.all([
      settlePayment(merchantTxnId),
      getBookingNumberForTxn(merchantTxnId),
    ]);

    void logCallbackAttempt({
      callbackType: 'success',
      merchantTxnId,
      outcome: status === 'success' ? 'settled_success' : `settled_${status}`,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    const bookingQs = bookingNumber ? `&booking=${encodeURIComponent(bookingNumber)}` : '';
    if (status === 'success') {
      return res.redirect(`${config.FRONTEND_URL}/payment/success?txn=${merchantTxnId}${bookingQs}`);
    }
    // EPS returned fail/cancelled/pending at the success URL — redirect to status page
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
    });
    return res.redirect(`${config.FRONTEND_URL}/payment/failed?reason=error`);
  }
});

// ─── Fail callback ────────────────────────────────────────────────
router.get('/callback/fail', validateMerchantTxnId, async (req: Request, res: Response) => {
  const merchantTxnId = req.query.merchantTransactionId as string;
  const [status, bookingNumber] = await Promise.all([
    settlePayment(merchantTxnId).catch(() => 'failed' as const),
    getBookingNumberForTxn(merchantTxnId),
  ]);

  void logCallbackAttempt({
    callbackType: 'fail',
    merchantTxnId,
    outcome: `received_fail_settled_${status}`,
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
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
  const [, bookingNumber] = await Promise.all([
    cancelPaymentRecord(merchantTxnId).catch(() => null),
    getBookingNumberForTxn(merchantTxnId),
  ]);

  void logCallbackAttempt({
    callbackType: 'cancel',
    merchantTxnId,
    outcome: 'received_cancel',
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  });

  const bookingQs = bookingNumber ? `&booking=${encodeURIComponent(bookingNumber)}` : '';
  return res.redirect(
    `${config.FRONTEND_URL}/payment/failed?txn=${merchantTxnId}&reason=cancelled${bookingQs}`,
  );
});

export default router;
