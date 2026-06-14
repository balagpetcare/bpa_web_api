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

import { S3Client, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { AppError } from '../utils/AppError';

// ─── Object key strategy ─────────────────────────────────────────

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
    // If S3_ENDPOINT is local MinIO, ensure base URL is correct.
    // .env has MEDIA_PUBLIC_BASE_URL=http://127.0.0.1:9000/bpa-pets
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
    this.validateConfig();

    this.bucket = config.S3_BUCKET!;
    this.client = new S3Client({
      region: config.S3_REGION ?? 'us-east-1',
      ...(config.S3_ENDPOINT ? { endpoint: config.S3_ENDPOINT } : {}),
      forcePathStyle: config.S3_FORCE_PATH_STYLE === 'true',
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY_ID!,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY!,
      },
    });
  }

  private validateConfig() {
    const missing = [];
    if (!config.S3_BUCKET) missing.push('S3_BUCKET');
    if (!config.S3_ACCESS_KEY_ID) missing.push('S3_ACCESS_KEY_ID');
    if (!config.S3_SECRET_ACCESS_KEY) missing.push('S3_SECRET_ACCESS_KEY');
    
    if (missing.length > 0) {
      throw new Error(`Missing S3 configuration keys: ${missing.join(', ')}. Check your .env file.`);
    }
  }

  /**
   * Performs a lightweight check to see if the bucket is accessible.
   */
  async healthCheck() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (err: any) {
      if (err.name === 'InvalidAccessKeyId' || err.$metadata?.httpStatusCode === 403) {
        throw AppError.internal('Invalid S3/MinIO credentials. Please check S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.');
      }
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        throw AppError.internal(`S3 Bucket "${this.bucket}" not found. Please create it first.`);
      }
      throw AppError.internal(`Storage health check failed: ${err.message}`);
    }
  }

  async upload(buffer: Buffer, objectKey: string, mimeType: string): Promise<void> {
    try {
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
    } catch (err: any) {
      console.error('[storage] S3 upload error:', err);
      if (err.name === 'InvalidAccessKeyId' || err.$metadata?.httpStatusCode === 403) {
        throw AppError.internal('Access denied to storage service. Check credentials.');
      }
      throw AppError.internal(`Failed to upload file to storage: ${err.message}`);
    }
  }

  async download(objectKey: string): Promise<Buffer> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }));
      if (!res.Body) throw new Error(`Empty body for ${objectKey}`);
      // @ts-ignore
      const chunks = [];
      // @ts-ignore
      for await (const chunk of res.Body) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (err: any) {
      throw AppError.internal(`Failed to download from storage: ${err.message}`);
    }
  }

  async delete(objectKey: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }));
    } catch (err: any) {
      console.warn(`[storage] Failed to delete "${objectKey}":`, err.message);
    }
  }
}

// ─── Local driver ────────────────────────────────────────────────

class LocalDriver {
  private readonly uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      console.log(`[storage] Creating local uploads directory at ${this.uploadsDir}`);
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async healthCheck() {
    if (!fs.existsSync(this.uploadsDir)) {
      throw AppError.internal(`Uploads directory not found at ${this.uploadsDir}`);
    }
  }

  async upload(buffer: Buffer, objectKey: string, _mimeType: string): Promise<void> {
    try {
      // Flatten to /uploads/<basename> for local dev simplicity
      const dest = path.join(this.uploadsDir, path.basename(objectKey));
      fs.writeFileSync(dest, buffer);
    } catch (err: any) {
      throw AppError.internal(`Failed to write file to disk: ${err.message}`);
    }
  }

  async download(objectKey: string): Promise<Buffer> {
    const filePath = path.join(this.uploadsDir, path.basename(objectKey));
    if (!fs.existsSync(filePath)) throw AppError.notFound('File not found on disk');
    return fs.readFileSync(filePath);
  }

  async delete(objectKey: string): Promise<void> {
    const filePath = path.join(this.uploadsDir, path.basename(objectKey));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  
  fileExists(objectKey: string): boolean {
    const filePath = path.join(this.uploadsDir, path.basename(objectKey));
    return fs.existsSync(filePath);
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

export async function checkStorageHealth() {
  await getDriver().healthCheck();
}

/**
 * Checks if a file exists (only for local driver, returns true for S3 to avoid latency).
 */
export function verifyFileExists(objectKey: string): boolean {
  const d = getDriver();
  if (d instanceof LocalDriver) {
    return d.fileExists(objectKey);
  }
  return true; // S3 assumed true to avoid HEAD request latency in lists
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
 * Upload a raw Buffer to storage.
 */
export async function uploadBufferToStorage(buffer: Buffer, originalname: string, mimeType: string): Promise<UploadResult> {
  const objectKey = buildObjectKey(originalname);
  await getDriver().upload(buffer, objectKey, mimeType);
  return { objectKey, url: getPublicUrl(objectKey) };
}

/**
 * Download an object from storage as a Buffer.
 */
export async function downloadFromStorage(objectKey: string): Promise<Buffer> {
  return getDriver().download(objectKey);
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
