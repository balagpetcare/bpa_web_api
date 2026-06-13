import { SmsStatus, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/response';
import type { SmsLogListQuery, SmsLogResponse } from './sms-logs.types';

function format(r: {
  id: string; to: string; body: string; status: SmsStatus; provider: string;
  providerRef: string | null; failureReason: string | null; payload: Prisma.JsonValue;
  sentAt: Date | null; createdAt: Date; updatedAt: Date;
}): SmsLogResponse {
  return {
    id: r.id, to: r.to, body: r.body, status: r.status, provider: r.provider,
    providerRef: r.providerRef, failureReason: r.failureReason,
    payload: r.payload as Record<string, unknown> | null,
    sentAt: r.sentAt, createdAt: r.createdAt, updatedAt: r.updatedAt,
  };
}

export async function listSmsLogs(query: SmsLogListQuery) {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit);
  const where: Prisma.SmsLogWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.provider) where.provider = { equals: query.provider, mode: 'insensitive' };
  if (query.search) {
    const s = query.search;
    where.OR = [
      { to: { contains: s, mode: 'insensitive' } },
      { providerRef: { contains: s, mode: 'insensitive' } },
    ];
  }
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {
      ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
    };
  }
  const [items, total] = await Promise.all([
    prisma.smsLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.smsLog.count({ where }),
  ]);
  return { items: items.map(format), meta: buildPaginationMeta(total, page, limit) };
}

export async function getSmsLogById(id: string): Promise<SmsLogResponse | null> {
  const r = await prisma.smsLog.findUnique({ where: { id } });
  return r ? format(r) : null;
}
