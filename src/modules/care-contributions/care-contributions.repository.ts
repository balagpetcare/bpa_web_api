import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/response';
import type { ContributionListQuery, UpdateContributionDto } from './care-contributions.types';

const contributionInclude = {
  plan: { select: { id: true, title: true, amountBdt: true, legalDisclaimerText: true } },
  zone: { select: { id: true, name: true, slug: true } },
  carePartnerCard: { select: { id: true, cardNumber: true, status: true } },
} as const;

export async function generateContributionNumber(): Promise<string> {
  const year = new Date().getFullYear().toString();
  const prefix = `BPA-CC-${year}-`;
  const last = await prisma.careContribution.findFirst({
    where: { contributionNumber: { startsWith: prefix } },
    orderBy: { contributionNumber: 'desc' },
  });
  const seq = last ? parseInt(last.contributionNumber.slice(-6), 10) + 1 : 1;
  return `${prefix}${seq.toString().padStart(6, '0')}`;
}

export async function createContribution(data: {
  contributionNumber: string;
  planId: string;
  zoneId: string;
  contributorName: string;
  contributorMobile: string;
  contributorEmail?: string;
  contributorAddress?: string;
  amountBdt: number;
  isAnonymous: boolean;
}) {
  return prisma.careContribution.create({
    data: {
      contributionNumber: data.contributionNumber,
      planId: data.planId,
      zoneId: data.zoneId,
      contributorName: data.contributorName,
      contributorMobile: data.contributorMobile,
      contributorEmail: data.contributorEmail,
      contributorAddress: data.contributorAddress,
      amountBdt: data.amountBdt,
      isAnonymous: data.isAnonymous,
    },
    include: contributionInclude,
  });
}

export async function linkPaymentToContribution(contributionId: string, paymentId: string) {
  return prisma.careContribution.update({
    where: { id: contributionId },
    data: { paymentId },
  });
}

export async function listContributions(query: ContributionListQuery) {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit);
  const where: Prisma.CareContributionWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.zoneId) where.zoneId = query.zoneId;
  if (query.search) {
    where.OR = [
      { contributorName: { contains: query.search, mode: 'insensitive' } },
      { contributorMobile: { contains: query.search } },
      { contributionNumber: { contains: query.search } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.careContribution.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: contributionInclude }),
    prisma.careContribution.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function getContributionById(id: string) {
  return prisma.careContribution.findUnique({ where: { id }, include: contributionInclude });
}

export async function getContributionByNumber(contributionNumber: string) {
  return prisma.careContribution.findUnique({ where: { contributionNumber }, include: contributionInclude });
}

export async function updateContribution(id: string, dto: UpdateContributionDto) {
  return prisma.careContribution.update({ where: { id }, data: dto, include: contributionInclude });
}
