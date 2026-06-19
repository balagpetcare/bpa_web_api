import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation failed',
        details: formattedErrors,
      },
    });
    return;
  }

  // ─── Prisma Known Request Errors ──────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // Unique constraint violation
        const fields = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
        res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          error: { code: ERROR_CODES.CONFLICT, message: `A record with this ${fields} already exists` },
        });
        return;
      }
      case 'P2025':
        // Record not found (e.g. update/delete on non-existent row)
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: { code: ERROR_CODES.NOT_FOUND, message: 'Record not found' },
        });
        return;
      case 'P2003': {
        // Foreign key constraint violation
        const field = (err.meta?.field_name as string | undefined) ?? 'relation';
        res.status(HTTP_STATUS.CONFLICT).json({
          success: false,
          error: { code: ERROR_CODES.CONFLICT, message: `Cannot complete operation: dependent record exists on '${field}'` },
        });
        return;
      }
      case 'P2023':
        // Inconsistent column data (e.g. invalid UUID format)
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid data format in request' },
        });
        return;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(HTTP_STATUS.INTERNAL_ERROR).json({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
  });
}
