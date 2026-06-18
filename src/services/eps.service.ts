import { EPS } from 'eps-gateway-nodejs';
import { config } from '../config';
import { AppError } from '../utils/AppError';

let _instance: EPS | null = null;

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
      username: config.EPS_USERNAME!,
      password: config.EPS_PASSWORD!,
      hashKey: config.EPS_HASH_KEY!,
      merchantId: config.EPS_MERCHANT_ID!,
      storeId: config.EPS_STORE_ID!,
      sandbox,
    });
  }

  return _instance;
}

export function getEPSMissingCredentials(): string[] {
  const missing: string[] = [];
  if (!config.EPS_USERNAME) missing.push('EPS_USERNAME');
  if (!config.EPS_PASSWORD) missing.push('EPS_PASSWORD');
  if (!config.EPS_HASH_KEY) missing.push('EPS_HASH_KEY');
  if (!config.EPS_MERCHANT_ID) missing.push('EPS_MERCHANT_ID');
  if (!config.EPS_STORE_ID) missing.push('EPS_STORE_ID');
  return missing;
}

/** Returns true when either naming convention activates EPS for donations. */
export function isDonationEPSMode(): boolean {
  // New convention: PAYMENT_PROVIDER=EPS + DONATION_PAYMENT_MODE=GATEWAY
  if (config.PAYMENT_PROVIDER === 'EPS' && config.DONATION_PAYMENT_MODE === 'GATEWAY') return true;
  // Legacy convention: EPS_ENABLED=true + PAYMENT_CHANNEL_MODE=EPS
  if (config.EPS_ENABLED === 'true' && config.PAYMENT_CHANNEL_MODE === 'EPS') return true;
  return false;
}

export function isEPSConfigured(): boolean {
  // Support both naming conventions
  const channelOk = config.PAYMENT_PROVIDER === 'EPS' || config.PAYMENT_CHANNEL_MODE === 'EPS';
  const enabledOk = config.EPS_ENABLED === 'true' || config.PAYMENT_PROVIDER === 'EPS';
  if (!channelOk || !enabledOk) return false;
  return !!(
    config.EPS_USERNAME &&
    config.EPS_PASSWORD &&
    config.EPS_HASH_KEY &&
    config.EPS_MERCHANT_ID &&
    config.EPS_STORE_ID
  );
}

export function isEpsMockModeEnabled(): boolean {
  return config.EPS_MOCK_MODE === 'true' && config.NODE_ENV !== 'production';
}

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
    return;
  }

  const env = config.EPS_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX (demo)';
  console.log(`[EPS] Payment gateway configured - mode: ${env}, PAYMENT_CHANNEL_MODE=${config.PAYMENT_CHANNEL_MODE}`);
}

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

const BD_PHONE_RE = /^01[3-9]\d{8}$/;

export function normalizeBdPhone(raw: string): string {
  const cleaned = raw.trim().replace(/[\s\-()+.]/g, '');

  let local = cleaned;
  if (local.startsWith('8801')) {
    local = local.slice(3);
  }

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
  bookingRef?: string;
  referenceRef?: string;
}

function containsLocalhost(url: string): boolean {
  return url.includes('localhost') || url.includes('127.0.0.1');
}

function buildCallbackUrl(
  apiBase: string,
  callbackPath: string,
  refs?: { bookingRef?: string; referenceRef?: string },
): string {
  const url = new URL(`${apiBase}${callbackPath}`);
  if (refs?.bookingRef) url.searchParams.set('bookingRef', refs.bookingRef);
  if (refs?.referenceRef) url.searchParams.set('ref', refs.referenceRef);
  return url.toString();
}

export async function initializeEpsPayment(params: EpsPaymentParams) {
  const customerPhone = normalizeBdPhone(params.customerPhone);
  const { bookingRef, referenceRef, ...epsParams } = params;

  const apiBase = config.BACKEND_URL.replace(/\/$/, '');
  const callbackRefs = { bookingRef, referenceRef };
  const successUrl = buildCallbackUrl(apiBase, '/api/v1/payment/callback/success', callbackRefs);
  const failUrl = buildCallbackUrl(apiBase, '/api/v1/payment/callback/fail', callbackRefs);
  const cancelUrl = buildCallbackUrl(apiBase, '/api/v1/payment/callback/cancel', callbackRefs);
  const epsPayload = { ...epsParams, customerPhone, successUrl, failUrl, cancelUrl };

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

  console.log(
    `[EPS] initializePayment | ` +
      `apiBase=${apiBase} | ` +
      `frontendBase=${config.FRONTEND_URL} | ` +
      `successUrl=${epsPayload.successUrl} | ` +
      `failUrl=${epsPayload.failUrl} | ` +
      `cancelUrl=${epsPayload.cancelUrl}`,
  );

  return getEPS().initializePayment(epsPayload);
}

const MEMBERSHIP_FEES: Record<string, number> = {
  regular: 500,
  student: 200,
  corporate: 5000,
};

export function getMembershipFee(type: string): number {
  return MEMBERSHIP_FEES[type] ?? 500;
}
