import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { ERROR_CODES } from '../config/constants';

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.unauthorized('No token provided', ERROR_CODES.UNAUTHORIZED);
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);

    const message =
      (err as Error).name === 'TokenExpiredError'
        ? 'Access token expired'
        : 'Invalid access token';

    const code =
      (err as Error).name === 'TokenExpiredError'
        ? ERROR_CODES.TOKEN_EXPIRED
        : ERROR_CODES.TOKEN_INVALID;

    next(AppError.unauthorized(message, code));
  }
}
