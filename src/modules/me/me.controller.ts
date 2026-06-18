import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import { getDashboardSummary, updateProfile } from './me.service';

export async function dashboardHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const data = await getDashboardSummary(userId);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function updateProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await updateProfile(req.user!.sub, req.body);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
