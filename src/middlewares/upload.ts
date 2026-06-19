import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

// Default limits
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB for images/documents
const MAX_VIDEO_SIZE = (process.env.MAX_VIDEO_UPLOAD_MB ? parseInt(process.env.MAX_VIDEO_UPLOAD_MB, 10) : 200) * 1024 * 1024; // Default to 200 MB for videos

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
]);

function isVideoMime(mime: string): boolean {
  return VIDEO_MIME_TYPES.has(mime);
}

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
): void {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        400,
        'UNSUPPORTED_MEDIA_TYPE',
        `File type "${file.mimetype}" is not allowed. Allowed: images, MP4/WebM/MOV/M4V video, PDF, DOC, DOCX.`,
      ),
    );
  }
}

const storage = multer.memoryStorage();

// Set multer statically to the maximum threshold (video size)
// We will down-enforce the 25MB limit for non-videos inside the middleware wrapper.
const multerSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_VIDEO_SIZE },
}).single('file');

const multerMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_VIDEO_SIZE, files: 20 },
}).array('files', 20);

// Helper to check and map multer errors to clean 400 AppError
function handleMulterError(err: any): any {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxVideoMb = process.env.MAX_VIDEO_UPLOAD_MB ? parseInt(process.env.MAX_VIDEO_UPLOAD_MB, 10) : 200;
      return new AppError(
        400,
        'LIMIT_FILE_SIZE',
        `File size exceeds the limit. Max allowed is ${maxVideoMb}MB for videos and 25MB for images/documents.`,
      );
    }
    return new AppError(400, 'UPLOAD_ERROR', `File upload error: ${err.message}`);
  }
  return err;
}

export function uploadSingle(req: Request, res: Response, next: NextFunction): void {
  multerSingle(req, res, (err) => {
    if (err) {
      return next(handleMulterError(err));
    }

    if (req.file) {
      const mime = req.file.mimetype;
      if (!isVideoMime(mime) && req.file.size > MAX_FILE_SIZE) {
        return next(
          new AppError(
            400,
            'LIMIT_FILE_SIZE',
            `File size exceeds the limit. Images and documents must be smaller than 25MB.`,
          ),
        );
      }
    }

    next();
  });
}

export function uploadMultiple(req: Request, res: Response, next: NextFunction): void {
  multerMultiple(req, res, (err) => {
    if (err) {
      return next(handleMulterError(err));
    }

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const mime = file.mimetype;
        if (!isVideoMime(mime) && file.size > MAX_FILE_SIZE) {
          return next(
            new AppError(
              400,
              'LIMIT_FILE_SIZE',
              `File "${file.originalname}" exceeds the size limit. Images and documents must be smaller than 25MB.`,
            ),
          );
        }
      }
    }

    next();
  });
}
