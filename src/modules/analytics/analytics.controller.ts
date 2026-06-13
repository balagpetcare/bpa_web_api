import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import * as svc from './analytics.service';

export async function summaryHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getAnalyticsSummary();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function trafficHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getAnalyticsTraffic(req.query.period as string | undefined);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function formsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await svc.getAnalyticsForms(req.query.period as string | undefined);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
