import { PaymentGateway, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/response';

export async function createPayment(data: {
  gateway: PaymentGateway;
  merchantTxnId: string;
  amount: number;
  currency?: string;
  purpose: string;
  payload?: Record<string, unknown>;
}) {
  return prisma.payment.create({
    data: {
      gateway: data.gateway,
      merchantTxnId: data.merchantTxnId,
      amount: data.amount,
      currency: data.currency ?? 'BDT',
      purpose: data.purpose,
      status: 'pending',
      payload: (data.payload ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function findPaymentByMerchantTxnId(merchantTxnId: string) {
  return prisma.payment.findUnique({ where: { merchantTxnId } });
}

export async function findPaymentById(id: string) {
  return prisma.payment.findUnique({ where: { id } });
}

export async function updatePaymentEpsTxnId(id: string, epsTxnId: string) {
  return prisma.payment.update({ where: { id }, data: { epsTxnId, gatewayRef: epsTxnId } });
}

export async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  extraPayload?: Record<string, unknown>,
) {
  return prisma.payment.update({
    where: { id },
    data: {
      status,
      ...(extraPayload ? { payload: extraPayload as Prisma.InputJsonValue } : {}),
    },
  });
}

export async function listPayments(params: {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  search?: string;
}) {
  const { page, limit, skip } = parsePaginationQuery(params.page, params.limit);
  const where: Prisma.PaymentWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.search) {
    where.OR = [
      { merchantTxnId: { contains: params.search, mode: 'insensitive' } },
      { epsTxnId: { contains: params.search, mode: 'insensitive' } },
      { gatewayRef: { contains: params.search, mode: 'insensitive' } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.payment.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.payment.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}
