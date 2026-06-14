import { EPS } from 'eps-gateway-nodejs';
import { config } from '../config';

// ─── Singleton ────────────────────────────────────────────────────

let _instance: EPS | null = null;

// EPS_ENV takes precedence; EPS_SANDBOX is the legacy fallback
function isSandbox(): boolean {
  return config.EPS_ENV === 'demo' || config.EPS_SANDBOX === 'true';
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

// ─── Membership fee lookup ────────────────────────────────────────

const MEMBERSHIP_FEES: Record<string, number> = {
  regular:   500,
  student:   200,
  corporate: 5000,
};

export function getMembershipFee(type: string): number {
  return MEMBERSHIP_FEES[type] ?? 500;
}
