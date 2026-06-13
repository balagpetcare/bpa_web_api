import { z } from 'zod';
import { SmsStatus } from '@prisma/client';

export const smsLogListQuerySchema = z.object({
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().max(100).optional(),
  search: z.string().optional(),
  status: z.nativeEnum(SmsStatus).optional(),
  provider: z.string().optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
});

export type SmsLogListQuery = z.infer<typeof smsLogListQuerySchema>;

export interface SmsLogResponse {
  id: string;
  to: string;
  body: string;
  status: SmsStatus;
  provider: string;
  providerRef: string | null;
  failureReason: string | null;
  payload: Record<string, unknown> | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
