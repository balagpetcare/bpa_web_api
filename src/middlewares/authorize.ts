import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ROLES } from '../config/constants';

export function authorize(resource: string, action: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { roles, permissions } = req.user;

    if (roles.includes(ROLES.SUPER_ADMIN)) {
      return next();
    }

    const required = `${resource}:${action}`;
    const hasPermission = permissions.includes(required) || permissions.includes(`${resource}:manage`);

    if (!hasPermission) {
      return next(
        AppError.forbidden(`You do not have permission to ${action} ${resource}`),
      );
    }

    next();
  };
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { roles } = req.user;

    if (roles.includes(ROLES.SUPER_ADMIN)) {
      return next();
    }

    const hasRole = allowedRoles.some((r) => roles.includes(r));
    if (!hasRole) {
      return next(AppError.forbidden('Insufficient role'));
    }

    next();
  };
}
