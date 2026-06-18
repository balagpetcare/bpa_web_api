import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import { getDashboardSummary } from './me.service';

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
