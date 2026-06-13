import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/response';
import * as svc from './sms-logs.service';

export async function listSmsLogsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.listSmsLogs(req.query as never)); } catch (e) { next(e); }
}

export async function getSmsLogHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try { sendSuccess(res, await svc.getSmsLog(req.params.id)); } catch (e) { next(e); }
}
