import { prisma } from '../../database/prisma';
import type { CommunityFundDashboard, CommunityFundOverview } from './community-fund.types';

export async function getDashboardStats(): Promise<CommunityFundDashboard> {
  const [
    zones,
    totalContributors,
    totalAmountResult,
    totalCards,
    totalActiveCards,
    totalCensus,
    recentContributions,
  ] = await Promise.all([
    prisma.communityZone.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, slug: true,
        targetContributors: true, currentContributors: true,
        targetAmountBdt: true, currentAmountBdt: true,
      },
      orderBy: [{ sortOrder: 'asc' }],
    }),
    prisma.careContribution.count({ where: { status: 'paid' } }),
    prisma.careContribution.aggregate({ where: { status: 'paid' }, _sum: { amountBdt: true } }),
    prisma.carePartnerCard.count(),
    prisma.carePartnerCard.count({ where: { status: 'active' } }),
    prisma.petCensusSubmission.count(),
    prisma.careContribution.findMany({
      where: { status: { in: ['paid', 'pending_payment'] } },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        contributionNumber: true,
        contributorName: true,
        isAnonymous: true,
        amountBdt: true,
        status: true,
        createdAt: true,
        zone: { select: { name: true } },
      },
    }),
  ]);

  const zoneSummary = zones.map(z => ({
    id: z.id,
    name: z.name,
    slug: z.slug,
    targetContributors: z.targetContributors,
    currentContributors: z.currentContributors,
    targetAmountBdt: Number(z.targetAmountBdt),
    currentAmountBdt: Number(z.currentAmountBdt),
    progressPercent: z.targetContributors > 0
      ? Math.min(100, Math.round((z.currentContributors / z.targetContributors) * 100))
      : 0,
  }));

  return {
    totalContributors,
    totalAmountBdt: Number(totalAmountResult._sum.amountBdt ?? 0),
    totalCards,
    totalActiveCards,
    totalCensusSubmissions: totalCensus,
    zones: zoneSummary,
    recentContributions: recentContributions.map(c => ({
      id: c.id,
      contributionNumber: c.contributionNumber,
      contributorName: c.isAnonymous ? null : c.contributorName,
      zoneName: c.zone.name,
      amountBdt: Number(c.amountBdt),
      status: c.status,
      createdAt: c.createdAt,
    })),
  };
}

export async function getPublicOverview(): Promise<CommunityFundOverview> {
  const [zones, totalContributors, totalAmountResult] = await Promise.all([
    prisma.communityZone.findMany({
      where: { isActive: true, status: 'active' },
      select: {
        id: true, name: true, slug: true,
        targetContributors: true, currentContributors: true,
        targetAmountBdt: true, currentAmountBdt: true,
        clinicAddress: true,
        coverImage: { select: { id: true, url: true, altText: true } },
      },
      orderBy: [{ sortOrder: 'asc' }],
    }),
    prisma.careContribution.count({ where: { status: 'paid' } }),
    prisma.careContribution.aggregate({ where: { status: 'paid' }, _sum: { amountBdt: true } }),
  ]);

  return {
    totalContributors,
    totalAmountBdt: Number(totalAmountResult._sum.amountBdt ?? 0),
    zones: zones.map(z => ({
      id: z.id,
      name: z.name,
      slug: z.slug,
      targetContributors: z.targetContributors,
      currentContributors: z.currentContributors,
      targetAmountBdt: Number(z.targetAmountBdt),
      currentAmountBdt: Number(z.currentAmountBdt),
      progressPercent: z.targetContributors > 0
        ? Math.min(100, Math.round((z.currentContributors / z.targetContributors) * 100))
        : 0,
      clinicAddress: z.clinicAddress,
      coverImage: z.coverImage,
    })),
  };
}
