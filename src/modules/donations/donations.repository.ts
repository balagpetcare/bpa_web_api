import { Prisma, DonationCampaignStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../database/prisma';

// ─── Purposes ───────────────────────────────────────────────────

export async function listPurposes(params: { isActive?: boolean } = {}) {
  return prisma.donationPurpose.findMany({
    where: {
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function findPurposeById(id: string) {
  return prisma.donationPurpose.findUnique({ where: { id } });
}

export async function findPurposeBySlug(slug: string) {
  return prisma.donationPurpose.findUnique({ where: { slug } });
}

export async function createPurpose(data: Prisma.DonationPurposeCreateInput) {
  return prisma.donationPurpose.create({ data });
}

export async function updatePurpose(id: string, data: Prisma.DonationPurposeUpdateInput) {
  return prisma.donationPurpose.update({ where: { id }, data });
}

export async function deletePurpose(id: string) {
  return prisma.donationPurpose.delete({ where: { id } });
}

// ─── Campaigns ──────────────────────────────────────────────────

export async function listCampaigns(params: {
  status?: DonationCampaignStatus;
  showOnDonatePage?: boolean;
} = {}) {
  return prisma.donationCampaign.findMany({
    where: {
      ...(params.status ? { status: params.status } : {}),
      ...(params.showOnDonatePage !== undefined ? { showOnDonatePage: params.showOnDonatePage } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { purpose: true },
  });
}

export async function findCampaignBySlug(slug: string) {
  return prisma.donationCampaign.findUnique({ where: { slug }, include: { purpose: true } });
}

export async function findCampaignById(id: string) {
  return prisma.donationCampaign.findUnique({ where: { id }, include: { purpose: true } });
}

export async function createCampaign(data: Prisma.DonationCampaignCreateInput) {
  return prisma.donationCampaign.create({ data });
}

export async function updateCampaign(id: string, data: Prisma.DonationCampaignUpdateInput) {
  return prisma.donationCampaign.update({ where: { id }, data });
}

export async function deleteCampaign(id: string) {
  return prisma.donationCampaign.delete({ where: { id } });
}

export async function updateCampaignProgress(campaignId: string, amount: number) {
  return prisma.donationCampaign.update({
    where: { id: campaignId },
    data: { raisedAmount: { increment: amount } },
  });
}

// ─── Donations ──────────────────────────────────────────────────

export async function createDonation(data: Prisma.DonationCreateInput) {
  return prisma.donation.create({ data });
}

export async function updateDonationStatus(id: string, status: PaymentStatus, gatewayTxnId?: string, paidAt?: Date) {
  return prisma.donation.update({
    where: { id },
    data: { 
      status,
      ...(gatewayTxnId ? { gatewayTransactionId: gatewayTxnId } : {}),
      ...(paidAt ? { paidAt } : {}),
    },
  });
}

export async function updateDonation(id: string, data: Prisma.DonationUpdateInput) {
  return prisma.donation.update({ where: { id }, data });
}

export async function findDonationByReference(referenceNo: string) {
  return prisma.donation.findUnique({
    where: { referenceNo },
    include: { payment: true, purpose: true, campaign: true, qrCode: true },
  });
}

export async function findDonationById(id: string) {
  return prisma.donation.findUnique({
    where: { id },
    include: { payment: true, purpose: true, campaign: true, qrCode: true },
  });
}

export async function findDonationByPaymentId(paymentId: string) {
  return prisma.donation.findUnique({ where: { paymentId }, include: { campaign: true, purpose: true } });
}

export async function getDonorWall(limit = 20) {
  return prisma.donation.findMany({
    where: { status: 'success', showOnDonorWall: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      donorName: true,
      amount: true,
      currency: true,
      isAnonymous: true,
      message: true,
      createdAt: true,
      campaign: { select: { titleEn: true, titleBn: true } },
      purpose: { select: { titleEn: true, titleBn: true } },
    },
  });
}

export async function listDonationsAdmin(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.DonationWhereInput = {
    ...(params.status ? { status: params.status as any } : {}),
    ...(params.search ? {
      OR: [
        { referenceNo: { contains: params.search, mode: 'insensitive' } },
        { donorName: { contains: params.search, mode: 'insensitive' } },
        { donorEmail: { contains: params.search, mode: 'insensitive' } },
        { donorPhone: { contains: params.search, mode: 'insensitive' } },
      ],
    } : {}),
    ...((params.dateFrom || params.dateTo) ? {
      createdAt: {
        ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
        ...(params.dateTo ? { lte: new Date(new Date(params.dateTo).setHours(23, 59, 59, 999)) } : {}),
      },
    } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { campaign: true, purpose: true },
    }),
    prisma.donation.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const meta = { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
  return { items, meta };
}

export async function getDonationsForExport() {
  return prisma.donation.findMany({
    orderBy: { createdAt: 'desc' },
    include: { campaign: true, purpose: true },
  });
}

// ─── Impact Stories ─────────────────────────────────────────────

export async function listImpactStories(params: { status?: string; showOnDonationPage?: boolean; campaignId?: string } = {}) {
  return prisma.donationImpactStory.findMany({
    where: {
      ...(params.status ? { status: params.status } : {}),
      ...(params.showOnDonationPage !== undefined ? { showOnDonationPage: params.showOnDonationPage } : {}),
      ...(params.campaignId ? { campaignId: params.campaignId } : {}),
    },
    orderBy: { sortOrder: 'asc' },
    include: { purpose: true, campaign: true },
  });
}

export async function createImpactStory(data: Prisma.DonationImpactStoryCreateInput) {
  return prisma.donationImpactStory.create({ data });
}

export async function updateImpactStory(id: string, data: Prisma.DonationImpactStoryUpdateInput) {
  return prisma.donationImpactStory.update({ where: { id }, data });
}

export async function deleteImpactStory(id: string) {
  return prisma.donationImpactStory.delete({ where: { id } });
}

// ─── QR Codes ───────────────────────────────────────────────────

export async function listQrCodes() {
  return prisma.donationQrCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: { purpose: true, campaign: true },
  });
}

export async function findQrCodeBySlug(slug: string) {
  return prisma.donationQrCode.findUnique({ where: { slug } });
}

export async function createQrCode(data: Prisma.DonationQrCodeCreateInput) {
  return prisma.donationQrCode.create({ data });
}

export async function updateQrCode(id: string, data: Prisma.DonationQrCodeUpdateInput) {
  return prisma.donationQrCode.update({ where: { id }, data });
}

export async function deleteQrCode(id: string) {
  return prisma.donationQrCode.delete({ where: { id } });
}

export async function incrementQrScanCount(id: string) {
  return prisma.donationQrCode.update({
    where: { id },
    data: { scanCount: { increment: 1 } },
  });
}

// ─── Transparency Reports ───────────────────────────────────────

export async function listTransparencyReports(params: { status?: string } = {}) {
  return prisma.donationTransparencyReport.findMany({
    where: {
      ...(params.status ? { status: params.status } : {}),
    },
    orderBy: { reportMonth: 'desc' },
  });
}

export async function createTransparencyReport(data: Prisma.DonationTransparencyReportCreateInput) {
  return prisma.donationTransparencyReport.create({ data });
}

export async function updateTransparencyReport(id: string, data: Prisma.DonationTransparencyReportUpdateInput) {
  return prisma.donationTransparencyReport.update({ where: { id }, data });
}

export async function deleteTransparencyReport(id: string) {
  return prisma.donationTransparencyReport.delete({ where: { id } });
}

// ─── Settings ───────────────────────────────────────────────────

export async function getDonationPageSettings() {
  let settings = await prisma.donationPageSetting.findFirst({
    where: { isActive: true },
  });

  if (!settings) {
    settings = await prisma.donationPageSetting.create({
      data: {
        heroTitleEn: 'Support Bangladesh Pet Association',
        isActive: true,
      },
    });
  }

  return settings;
}

export async function updateDonationPageSettings(id: string, data: Prisma.DonationPageSettingUpdateInput) {
  return prisma.donationPageSetting.update({ where: { id }, data });
}

// ─── Dashboard Stats ────────────────────────────────────────────

export async function getDashboardStats() {
  const [
    totalDonations,
    successfulDonations,
    totalRaisedAggregate,
    activeCampaigns,
  ] = await Promise.all([
    prisma.donation.count(),
    prisma.donation.count({ where: { status: 'success' } }),
    prisma.donation.aggregate({ where: { status: 'success' }, _sum: { amount: true } }),
    prisma.donationCampaign.count({ where: { status: 'ACTIVE' } }),
  ]);

  return {
    totalDonations,
    successfulDonations,
    totalRaised: Number(totalRaisedAggregate._sum.amount || 0),
    activeCampaigns,
  };
}
