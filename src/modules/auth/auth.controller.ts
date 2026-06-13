import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import { HTTP_STATUS } from '../../config/constants';
import * as authService from './auth.service';

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tokens = await authService.login(req.body);
    sendSuccess(res, tokens, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await authService.refresh(refreshToken);
    sendSuccess(res, tokens, HTTP_STATUS.OK);
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    await authService.logout(refreshToken);
    res.status(HTTP_STATUS.NO_CONTENT).send();
  } catch (err) {
    next(err);
  }
}

export async function meHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.getMe(req.user.sub);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
