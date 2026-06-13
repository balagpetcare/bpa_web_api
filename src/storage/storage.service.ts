/**
 * Centralized storage abstraction.
 *
 * STORAGE_DRIVER=s3   → uploads to any S3-compatible provider (MinIO, AWS S3,
 *                         DigitalOcean Spaces, Wasabi, Cloudflare R2) via env vars.
 * STORAGE_DRIVER=local → writes to ./uploads/ directory (dev fallback).
 *
 * To switch from local MinIO to production AWS S3:
 *   change only S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY in .env
 *   and set S3_FORCE_PATH_STYLE=false — no code changes required.
 */

import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

// ─── Object key strategy ─────────────────────────────────────────
// Keys: media/<YYYY>/<MM>/<uuid><ext>
// e.g. media/2024/06/3f2a1b4c-....jpg
// This is stored in MediaFile.filename and is the lookup key for deletes.

export function buildObjectKey(originalname: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const ext = path.extname(originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '';
  return `media/${year}/${month}/${uuidv4()}${ext}`;
}

export function getPublicUrl(objectKey: string): string {
  const base = (config.MEDIA_PUBLIC_BASE_URL ?? config.BACKEND_URL).replace(/\/$/, '');
  if (config.STORAGE_DRIVER === 's3') {
    return `${base}/${objectKey}`;
  }
  // local: only the filename part lives under /uploads
  return `${config.BACKEND_URL}/uploads/${path.basename(objectKey)}`;
}

export interface UploadResult {
  objectKey: string;
  url: string;
}

// ─── S3 driver ──────────────────────────────────────────────────

class S3Driver {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    if (!config.S3_BUCKET)      throw new Error('S3_BUCKET is required when STORAGE_DRIVER=s3');
    if (!config.S3_ACCESS_KEY_ID)   throw new Error('S3_ACCESS_KEY_ID is required when STORAGE_DRIVER=s3');
    if (!config.S3_SECRET_ACCESS_KEY) throw new Error('S3_SECRET_ACCESS_KEY is required when STORAGE_DRIVER=s3');

    this.bucket = config.S3_BUCKET;
    this.client = new S3Client({
      region: config.S3_REGION ?? 'us-east-1',
      ...(config.S3_ENDPOINT ? { endpoint: config.S3_ENDPOINT } : {}),
      forcePathStyle: config.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY_ID,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async upload(buffer: Buffer, objectKey: string, mimeType: string): Promise<void> {
    const up = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: objectKey,
        Body: buffer,
        ContentType: mimeType,
      },
    });
    await up.done();
  }

  async delete(objectKey: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
  }
}

// ─── Local driver ────────────────────────────────────────────────

class LocalDriver {
  private readonly uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async upload(buffer: Buffer, objectKey: string, _mimeType: string): Promise<void> {
    // Flatten to /uploads/<basename> for local dev simplicity
    const dest = path.join(this.uploadsDir, path.basename(objectKey));
    fs.writeFileSync(dest, buffer);
  }

  async delete(objectKey: string): Promise<void> {
    const filePath = path.join(this.uploadsDir, path.basename(objectKey));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

// ─── Singleton ───────────────────────────────────────────────────

let _driver: S3Driver | LocalDriver | null = null;

function getDriver(): S3Driver | LocalDriver {
  if (!_driver) {
    _driver = config.STORAGE_DRIVER === 's3' ? new S3Driver() : new LocalDriver();
  }
  return _driver;
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Upload a multer in-memory file to the configured storage backend.
 * Returns the objectKey (stored in MediaFile.filename) and the public URL.
 */
export async function uploadToStorage(file: Express.Multer.File): Promise<UploadResult> {
  if (!file.buffer) throw new Error('uploadToStorage requires multer memoryStorage — file.buffer is empty');
  const objectKey = buildObjectKey(file.originalname);
  await getDriver().upload(file.buffer, objectKey, file.mimetype);
  return { objectKey, url: getPublicUrl(objectKey) };
}

/**
 * Delete a stored object by its objectKey (the value saved in MediaFile.filename).
 * Non-fatal: logs a warning on failure but does not throw.
 */
export async function deleteFromStorage(objectKey: string): Promise<void> {
  if (!objectKey) return;
  try {
    await getDriver().delete(objectKey);
  } catch (err) {
    console.warn(`[storage] Failed to delete "${objectKey}":`, (err as Error).message);
  }
}
