import { EPS } from 'eps-gateway-nodejs';
import { config } from '../config';
import { AppError } from '../utils/AppError';

// ─── Singleton ────────────────────────────────────────────────────

let _instance: EPS | null = null;

// EPS_ENV takes full precedence when explicitly set.
// EPS_SANDBOX is the legacy fallback and defaults to 'true', so it must NOT be
// consulted when EPS_ENV=production — otherwise the default would always win.
function isSandbox(): boolean {
  if (config.EPS_ENV === 'production') return false;
  if (config.EPS_ENV === 'demo') return true;
  return config.EPS_SANDBOX === 'true';
}

export function getEPS(): EPS {
  if (!_instance) {
    const missing: string[] = [];
    if (!config.EPS_USERNAME) missing.push('EPS_USERNAME');
    if (!config.EPS_PASSWORD) missing.push('EPS_PASSWORD');
    if (!config.EPS_HASH_KEY) missing.push('EPS_HASH_KEY');
    if (!config.EPS_MERCHANT_ID) missing.push('EPS_MERCHANT_ID');
    if (!config.EPS_STORE_ID) missing.push('EPS_STORE_ID');
    if (missing.length) {
      throw new Error(`EPS gateway is not configured. Missing env vars: ${missing.join(', ')}`);
    }
    const sandbox = isSandbox();
    console.log(`[EPS] Initializing in ${sandbox ? 'SANDBOX (demo)' : 'PRODUCTION'} mode`);
    _instance = new EPS({
      username:   config.EPS_USERNAME!,
      password:   config.EPS_PASSWORD!,
      hashKey:    config.EPS_HASH_KEY!,
      merchantId: config.EPS_MERCHANT_ID!,
      storeId:    config.EPS_STORE_ID!,
      sandbox,
    });
  }
  return _instance;
}

export function isEPSConfigured(): boolean {
  if (config.PAYMENT_CHANNEL_MODE !== 'EPS') return false;
  if (config.EPS_ENABLED !== 'true') return false;
  return !!(config.EPS_USERNAME && config.EPS_PASSWORD && config.EPS_HASH_KEY &&
            config.EPS_MERCHANT_ID && config.EPS_STORE_ID);
}

/**
 * Validates EPS config on startup when EPS_ENABLED=true.
 * Logs a clear error if credentials are incomplete so operators
 * catch misconfiguration immediately rather than at first payment.
 */
export function validateEPSStartup(): void {
  if (config.EPS_ENABLED !== 'true') return;
  const missing: string[] = [];
  if (!config.EPS_USERNAME) missing.push('EPS_USERNAME');
  if (!config.EPS_PASSWORD) missing.push('EPS_PASSWORD');
  if (!config.EPS_HASH_KEY) missing.push('EPS_HASH_KEY');
  if (!config.EPS_MERCHANT_ID) missing.push('EPS_MERCHANT_ID');
  if (!config.EPS_STORE_ID) missing.push('EPS_STORE_ID');
  if (missing.length) {
    console.error(`[EPS] FATAL: EPS_ENABLED=true but the following credentials are missing: ${missing.join(', ')}`);
    console.error('[EPS] Set all required EPS_* variables in .env or the process will fall back to manual payment mode.');
  } else {
    const env = config.EPS_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX (demo)';
    console.log(`[EPS] Payment gateway configured — mode: ${env}, PAYMENT_CHANNEL_MODE=${config.PAYMENT_CHANNEL_MODE}`);
  }
}

// ─── Transaction ID ───────────────────────────────────────────────

export function generateMerchantTxnId(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
    pad(now.getMilliseconds(), 3),
  ].join('');
}

// ─── Bangladesh phone normalization ──────────────────────────────

// Valid Bangladesh mobile: 01[3-9]XXXXXXXX (11 digits)
const BD_PHONE_RE = /^01[3-9]\d{8}$/;

/**
 * Normalizes a Bangladesh mobile number to the 01XXXXXXXXX format EPS requires.
 * Handles +8801..., 8801..., 01..., and formatted variants (spaces, hyphens, brackets).
 * Throws a 400 AppError if the result is not a valid BD mobile number.
 */
export function normalizeBdPhone(raw: string): string {
  // Strip whitespace, hyphens, brackets, dots, plus signs
  const cleaned = raw.trim().replace(/[\s\-()+.]/g, '');

  let local = cleaned;

  // Strip Bangladesh country code: 8801XXXXXXXXX → 1XXXXXXXX → prepend 0 below
  if (local.startsWith('8801')) {
    local = local.slice(3); // '880' removed, leaves '1XXXXXXXX' (10 digits)
  }

  // A 10-digit number without leading 0 (e.g. after country-code strip)
  if (!local.startsWith('0') && local.length === 10) {
    local = '0' + local;
  }

  if (!BD_PHONE_RE.test(local)) {
    throw AppError.badRequest(
      `Invalid phone number. Expected Bangladesh mobile format: 01XXXXXXXXX (e.g. 01712345678). Received: "${raw}"`,
    );
  }
  return local;
}

// ─── Centralized payment initialization ──────────────────────────

export interface EpsPaymentParams {
  customerOrderId: string;
  merchantTransactionId: string;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerState: string;
  customerPostcode: string;
  productName: string;
  valueA?: string;
  valueB?: string;
  valueC?: string;
}

function containsLocalhost(url: string): boolean {
  return url.includes('localhost') || url.includes('127.0.0.1');
}

/**
 * Builds EPS callback URLs from BACKEND_URL, validates them, logs them
 * (without credentials), then calls eps.initializePayment().
 *
 * All five EPS payment call sites use this instead of constructing URLs
 * inline. This is the single source of truth for URL building and the
 * production localhost guard.
 */
export async function initializeEpsPayment(params: EpsPaymentParams) {
  // Normalize phone before anything else — throws 400 if the number is invalid
  const customerPhone = normalizeBdPhone(params.customerPhone);

  const apiBase    = config.BACKEND_URL.replace(/\/$/, '');
  const successUrl = `${apiBase}/api/v1/payment/callback/success`;
  const failUrl    = `${apiBase}/api/v1/payment/callback/fail`;
  const cancelUrl  = `${apiBase}/api/v1/payment/callback/cancel`;

  // Production guard: localhost callback URLs will never be reachable by EPS.
  // Throw here — before the SDK call — so the error surfaces in logs immediately.
  if (config.NODE_ENV === 'production') {
    if (containsLocalhost(apiBase) || containsLocalhost(config.FRONTEND_URL)) {
      throw new Error(
        `[EPS] Config error: localhost URL detected in production. ` +
        `BACKEND_URL="${apiBase}" FRONTEND_URL="${config.FRONTEND_URL}". ` +
        `Set both to production hostnames ` +
        `(e.g. BACKEND_URL=https://api.bangladeshpetassociation.com, ` +
        `FRONTEND_URL=https://bangladeshpetassociation.com).`,
      );
    }
  }

  // Log redirect/callback URLs and base config. Never log credentials.
  console.log(
    `[EPS] initializePayment | ` +
    `apiBase=${apiBase} | ` +
    `frontendBase=${config.FRONTEND_URL} | ` +
    `successUrl=${successUrl} | ` +
    `failUrl=${failUrl} | ` +
    `cancelUrl=${cancelUrl}`,
  );

  return getEPS().initializePayment({ ...params, customerPhone, successUrl, failUrl, cancelUrl });
}

// ─── Membership fee lookup ────────────────────────────────────────

const MEMBERSHIP_FEES: Record<string, number> = {
  regular:   500,
  student:   200,
  corporate: 5000,
};

export function getMembershipFee(type: string): number {
  return MEMBERSHIP_FEES[type] ?? 500;
}
