import { AppError } from '../../utils/AppError';
import * as repo from './sms-logs.repository';
import type { SmsLogListQuery } from './sms-logs.types';

export async function listSmsLogs(query: SmsLogListQuery) {
  return repo.listSmsLogs(query);
}

export async function getSmsLog(id: string) {
  const r = await repo.getSmsLogById(id);
  if (!r) throw AppError.notFound('SMS log not found');
  return r;
}
