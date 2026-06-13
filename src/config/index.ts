import 'dotenv/config';

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),

  BCRYPT_ROUNDS: z.coerce.number().default(12),

  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().optional(),
  EMAIL_SECURE: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  SMS_API_URL: z.string().optional(),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().optional(),

  // EPS Payment Gateway SDK credentials
  EPS_USERNAME: z.string().optional(),
  EPS_PASSWORD: z.string().optional(),
  EPS_HASH_KEY: z.string().optional(),
  EPS_MERCHANT_ID: z.string().optional(),
  EPS_STORE_ID: z.string().optional(),
  EPS_SANDBOX: z.enum(['true', 'false']).default('true'),

  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  BACKEND_URL: z.string().url().default('http://localhost:4000'),

  // Comma-separated list of IPs allowed to hit payment callback endpoints.
  // When empty (development default), no IP filtering is applied.
  EPS_CALLBACK_IPS: z.string().default(''),

  // HMAC secret for QR token generation — keep stable per campaign lifecycle
  QR_SECRET: z.string().default('bpa-qr-secret-change-in-production-min32chars!!'),

  // ─── Media / File Storage ────────────────────────────────────────────────
  // STORAGE_DRIVER=s3    → S3-compatible (MinIO, AWS S3, DO Spaces, Wasabi, R2)
  // STORAGE_DRIVER=local → local disk ./uploads/ (development fallback)
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),

  // Required when STORAGE_DRIVER=s3
  S3_ENDPOINT: z.string().optional(),          // http://127.0.0.1:9000 for MinIO; omit for AWS
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).default('false'), // 'true' for MinIO

  // Full public base URL for media served to clients.
  //   MinIO (local):  http://127.0.0.1:9000/bpa-pets
  //   AWS S3:         https://bpa-pets.s3.amazonaws.com
  //   Local fallback: leave unset → BACKEND_URL/uploads is used
  MEDIA_PUBLIC_BASE_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

export const corsOrigins = config.CORS_ORIGINS.split(',').map((o) => o.trim());

const QR_SECRET_DEFAULT = 'bpa-qr-secret-change-in-production-min32chars!!';
if (config.NODE_ENV === 'production' && config.QR_SECRET === QR_SECRET_DEFAULT) {
  console.error('[SECURITY] QR_SECRET is using the insecure default value. Set QR_SECRET in environment before deploying to production!');
  process.exit(1);
}
