import { RegistrationStatus } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../utils/AppError';
import { getEPS, isEPSConfigured } from '../../services/eps.service';
import * as repo from './payments.repository';
import { settleCampaignPayment, cancelCampaignPayment } from '../campaign-registrations/campaign-registrations.service';
import { issueCarePartnerCardOnPayment } from '../care-partner-cards/care-partner-cards.service';

// ─── Verify & settle payment ──────────────────────────────────────

export async function settlePayment(merchantTxnId: string): Promise<'success' | 'failed' | 'pending'> {
  const payment = await repo.findPaymentByMerchantTxnId(merchantTxnId);
  if (!payment) throw AppError.notFound('Payment');

  // Already settled — don't re-verify
  if (payment.status === 'success' || payment.status === 'failed') {
    return payment.status;
  }

  if (!isEPSConfigured()) {
    throw AppError.badRequest('EPS gateway not configured');
  }

  const eps = getEPS();
  let epsStatus: string;
  let epsPayload: Record<string, unknown> = {};

  try {
    const result = await eps.verifyPayment({ merchantTransactionId: merchantTxnId });
    epsStatus = result.Status;
    epsPayload = result as unknown as Record<string, unknown>;
  } catch {
    // Network or EPS error — leave pending
    return 'pending';
  }

  if (epsStatus === 'Success') {
    await repo.updatePaymentStatus(payment.id, 'success', epsPayload);
    await activateLinkedEntities(payment);
    return 'success';
  } else if (epsStatus === 'Failed' || epsStatus === 'Cancelled') {
    await repo.updatePaymentStatus(payment.id, 'failed', epsPayload);
    await deactivateLinkedEntities(payment);
    return 'failed';
  }

  return 'pending';
}

// ─── Activate linked entities on payment success ──────────────────

async function activateLinkedEntities(payment: { id: string; entityType: string | null }): Promise<void> {
  if (payment.entityType === 'campaign') {
    await settleCampaignPayment(payment.id);
    return;
  }
  if (payment.entityType === 'care_partner') {
    await issueCarePartnerCardOnPayment(payment.id);
    return;
  }
  // Default: event registrations
  await prisma.eventRegistration.updateMany({
    where: { paymentId: payment.id, status: 'pending' },
    data: { status: RegistrationStatus.confirmed },
  });
}

async function deactivateLinkedEntities(payment: { id: string; entityType: string | null }): Promise<void> {
  if (payment.entityType === 'campaign') {
    await cancelCampaignPayment(payment.id);
    return;
  }
  if (payment.entityType === 'care_partner') {
    await cancelCarePartnerContribution(payment.id);
    return;
  }
}

async function cancelCarePartnerContribution(paymentId: string): Promise<void> {
  await prisma.careContribution.updateMany({
    where: { paymentId, status: 'pending_payment' },
    data: { status: 'cancelled' },
  });
}

// ─── Admin: force sync ────────────────────────────────────────────

export async function syncPayment(id: string) {
  const payment = await repo.findPaymentById(id);
  if (!payment) throw AppError.notFound('Payment');
  if (!payment.merchantTxnId) throw AppError.badRequest('Payment has no merchantTxnId to verify');

  const status = await settlePayment(payment.merchantTxnId);
  return { id: payment.id, status };
}

// ─── Admin: list payments ─────────────────────────────────────────

export async function listPayments(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  return repo.listPayments({
    page: params.page,
    limit: params.limit,
    status: params.status as never,
    search: params.search,
  });
}

export async function getPayment(id: string) {
  const p = await repo.findPaymentById(id);
  if (!p) throw AppError.notFound('Payment');
  return p;
}
