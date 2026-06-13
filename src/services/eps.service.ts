import { EPS } from 'eps-gateway-nodejs';
import { config } from '../config';

// ─── Singleton ────────────────────────────────────────────────────

let _instance: EPS | null = null;

export function getEPS(): EPS {
  if (!_instance) {
    if (!config.EPS_USERNAME || !config.EPS_PASSWORD || !config.EPS_HASH_KEY ||
        !config.EPS_MERCHANT_ID || !config.EPS_STORE_ID) {
      throw new Error('EPS gateway is not configured. Set EPS_USERNAME, EPS_PASSWORD, EPS_HASH_KEY, EPS_MERCHANT_ID, EPS_STORE_ID in environment.');
    }
    _instance = new EPS({
      username:   config.EPS_USERNAME,
      password:   config.EPS_PASSWORD,
      hashKey:    config.EPS_HASH_KEY,
      merchantId: config.EPS_MERCHANT_ID,
      storeId:    config.EPS_STORE_ID,
      sandbox:    config.EPS_SANDBOX === 'true',
    });
  }
  return _instance;
}

export function isEPSConfigured(): boolean {
  return !!(config.EPS_USERNAME && config.EPS_PASSWORD && config.EPS_HASH_KEY &&
            config.EPS_MERCHANT_ID && config.EPS_STORE_ID);
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
