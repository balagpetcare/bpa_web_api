import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { prisma } from '../../database/prisma';
import { settlePayment } from './payments.service';
import { callbackLimiter } from '../../middlewares/rateLimiter';

const router = Router();

// ─── Merchant TXN ID format ───────────────────────────────────────
// Format: YYYYMMDDHHmmssSSS — exactly 17 digits
const MERCHANT_TXN_ID_RE = /^\d{17}$/;

// All param names EPS may use for the merchant transaction ID.
// EPS documentation is inconsistent across SDK versions — normalize all of them.
const TXN_PARAM_NAMES = [
  'merchantTransactionId', // primary — set in initializePayment
  'merchantTxnId',
  'txn',
  'transactionId',
  'transaction_id',
  'epwTxnId',
  'paymentRefId',
  'payment_ref_id',
] as const;

// Param names that may carry a fallback order/reference ID (payment.id UUID or booking ref)
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
// Populated from EPS_CALLBACK_IPS env var (comma-separated). Empty = no filtering (dev).
const allowedCallbackIPs: Set<string> = new Set(
  config.EPS_CALLBACK_IPS
    ? config.EPS_CALLBACK_IPS.split(',').map((ip) => ip.trim()).filter(Boolean)
    : [],
);

// ─── IP allowlist middleware ──────────────────────────────────────
function requireCallbackIP(req: Request, res: Response, next: NextFunction): void {
  if (allowedCallbackIPs.size === 0) {
    // No allowlist configured — allow all (development / unconfigured)
    return next();
  }
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
    // Log received query key names only — never log values to avoid leaking payment data
    const receivedKeys = Object.keys(req.query).join(', ') || '(none)';
    console.warn(`[EPS callback] No valid merchant transaction ID found. Path: ${req.path} | Query keys: ${receivedKeys}`);
    void logCallbackAttempt({
      callbackType: deriveCallbackType(req.path),
      merchantTxnId: null,
      outcome: 'rejected_invalid_id',
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
    // Pass any fallback order reference to the frontend so support has a reference number
    const orderRef = extractOrderRef(req.query);
    const qs = orderRef ? `?reason=missing_txn&ref=${encodeURIComponent(orderRef)}` : '?reason=missing_txn';
    res.redirect(`${config.FRONTEND_URL}/payment/failed${qs}`);
    return;
  }

  if (found.paramName !== 'merchantTransactionId') {
    console.log(`[EPS callback] Merchant TXN ID found in non-standard param "${found.paramName}" — normalizing`);
  }
  // Normalize so all downstream handlers read from the canonical param name
  req.query.merchantTransactionId = found.txnId;
  next();
}

function deriveCallbackType(path: string): string {
  if (path.includes('success')) return 'success';
  if (path.includes('fail')) return 'fail';
  if (path.includes('cancel')) return 'cancel';
  return 'unknown';
}

// ─── Audit logging helper ─────────────────────────────────────────
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
        newValues: {
          callbackType: opts.callbackType,
          outcome: opts.outcome,
        },
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
    const status = await settlePayment(merchantTxnId);
    const outcome = status === 'success' ? 'settled_success' : 'settled_failed';
    void logCallbackAttempt({
      callbackType: 'success',
      merchantTxnId,
      outcome,
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });

    if (status === 'success') {
      return res.redirect(`${config.FRONTEND_URL}/payment/success?txn=${merchantTxnId}`);
    }
    return res.redirect(
      `${config.FRONTEND_URL}/payment/failed?txn=${merchantTxnId}&reason=verification_failed`,
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
  try {
    await settlePayment(merchantTxnId);
  } catch { /* best effort */ }

  void logCallbackAttempt({
    callbackType: 'fail',
    merchantTxnId,
    outcome: 'received_fail',
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  });

  return res.redirect(
    `${config.FRONTEND_URL}/payment/failed?txn=${merchantTxnId}&reason=payment_failed`,
  );
});

// ─── Cancel callback ──────────────────────────────────────────────
router.get('/callback/cancel', validateMerchantTxnId, async (req: Request, res: Response) => {
  const merchantTxnId = req.query.merchantTransactionId as string;
  try {
    await settlePayment(merchantTxnId);
  } catch { /* best effort */ }

  void logCallbackAttempt({
    callbackType: 'cancel',
    merchantTxnId,
    outcome: 'received_cancel',
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  });

  return res.redirect(
    `${config.FRONTEND_URL}/payment/failed?txn=${merchantTxnId}&reason=cancelled`,
  );
});

export default router;
