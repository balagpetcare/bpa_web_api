import { prisma } from '../../database/prisma';
import { AppError } from '../../utils/AppError';
import { config } from '../../config';
import type {
  DashboardSummaryResponse,
  DashboardUserSection,
  DashboardMembershipSection,
  DashboardPetsSection,
  DashboardBookingsSection,
  DashboardBookingItem,
  DashboardContributionsSection,
  DashboardContributionItem,
  DashboardCarePartnerCardSection,
  DashboardImpactSection,
  DashboardDocumentItem,
  DashboardNotification,
  DashboardTransparencySection,
  DashboardActivity,
} from './me.types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeProfileCompletion(user: {
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
}): number {
  let score = 25; // name always present (required at registration)
  if (user.email) score += 25;
  if (user.phone) score += 25;
  if (user.avatarUrl) score += 25;
  return score;
}

function decimalToNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

function frontendUrl(path: string): string {
  return `${config.FRONTEND_URL}${path}`;
}

// ─── Profile update ─────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (!cleaned.startsWith('880')) cleaned = '880' + cleaned;
  return cleaned;
}

export async function updateProfile(
  userId: string,
  dto: { name?: string; phone?: string },
): Promise<{ id: string; name: string; email: string | null; phone: string | null; avatarUrl: string | null; profileCompletion: number }> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw AppError.notFound('User');

  const data: { name?: string; phone?: string | null } = {};

  if (dto.name?.trim()) {
    data.name = dto.name.trim();
  }

  if (dto.phone !== undefined) {
    if (dto.phone === '' || dto.phone === null) {
      data.phone = null;
    } else {
      const normalized = normalizePhone(dto.phone);
      if (normalized !== user.phone) {
        const conflict = await prisma.user.findFirst({
          where: { phone: normalized, id: { not: userId }, deletedAt: null },
        });
        if (conflict) throw AppError.badRequest('This phone number is already in use.');
        data.phone = normalized;
      }
    }
  }

  const updated = await prisma.user.update({ where: { id: userId }, data });

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    avatarUrl: updated.avatarUrl,
    profileCompletion: computeProfileCompletion(updated),
  };
}

// ─── Main aggregation ────────────────────────────────────────────────────────

export async function getDashboardSummary(userId: string): Promise<DashboardSummaryResponse> {
  // 1. Load the user
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      createdAt: true,
      userRoles: { select: { role: { select: { name: true } } } },
    },
  });
  if (!user) throw AppError.notFound('User');

  // 2. Parallel data fetch — everything scoped to this user
  const [
    petOwners,
    careContributions,
    communityMembership,
    transparencyData,
    zoneStats,
    latestReport,
  ] = await Promise.all([
    // Pets via PetOwner (userId FK exists)
    prisma.petOwner.findMany({
      where: { userId },
      select: {
        id: true,
        pets: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            petType: true,
            gender: true,
            breed: true,
            approxAge: true,
            isActive: true,
            vaccinationRecords: {
              select: { id: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        registrations: {
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            totalAmountBdt: true,
            createdAt: true,
            updatedAt: true,
            campaign: { select: { title: true, slug: true } },
            session: { select: { sessionDate: true } },
            payment: { select: { status: true } },
            petBookings: {
              select: {
                id: true,
                petId: true,
                status: true,
                certificates: {
                  select: {
                    id: true,
                    certificateNumber: true,
                    verifyToken: true,
                    issuedAt: true,
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    }),

    // Care contributions — match by email OR phone (no userId FK on this table)
    user.email || user.phone
      ? prisma.careContribution.findMany({
          where: {
            OR: [
              ...(user.email ? [{ contributorEmail: user.email }] : []),
              ...(user.phone ? [{ contributorMobile: user.phone }] : []),
            ],
          },
          select: {
            id: true,
            contributionNumber: true,
            amountBdt: true,
            status: true,
            createdAt: true,
            plan: { select: { title: true } },
            zone: { select: { name: true, slug: true } },
            card: {
              select: {
                id: true,
                cardNumber: true,
                qrToken: true,
                status: true,
                issuedAt: true,
                expiresAt: true,
                zone: { select: { name: true, slug: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),

    // Community membership purchase — match by email OR phone
    user.email || user.phone
      ? prisma.communityMembershipPurchase.findFirst({
          where: {
            status: { in: ['paid', 'pending_payment'] },
            OR: [
              ...(user.email ? [{ memberEmail: user.email }] : []),
              ...(user.phone ? [{ memberMobile: user.phone }] : []),
            ],
          },
          select: {
            id: true,
            amountBdt: true,
            status: true,
            startsAt: true,
            expiresAt: true,
            purchasedAt: true,
            petLimit: true,
            preferredZone: { select: { name: true } },
            tier: {
              select: {
                id: true,
                nameEn: true,
                slug: true,
                validityMonths: true,
              },
            },
            card: {
              select: {
                id: true,
                cardNumber: true,
                qrToken: true,
                status: true,
                issuedAt: true,
                expiresAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve(null),

    // Transparency aggregate — total collected across all reports
    prisma.transparencyReport.aggregate({
      where: { status: 'published' },
      _sum: { totalCollectedBdt: true },
      _count: { id: true },
    }),

    // Community zone aggregate — active zones
    prisma.communityZone.aggregate({
      where: { isActive: true },
      _count: { id: true },
    }),

    // Latest published transparency report
    prisma.transparencyReport.findFirst({
      where: { status: 'published' },
      select: { title: true, slug: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    }),
  ]);

  // 3. Flatten data structures ──────────────────────────────────────────────

  const allPets = petOwners.flatMap((o) => o.pets);
  const allRegistrations = petOwners.flatMap((o) => o.registrations);

  // Build booking items
  const bookingItems: DashboardBookingItem[] = allRegistrations.map((reg) => {
    const cert = reg.petBookings.find((pb) => pb.certificates.length > 0)?.certificates[0];
    return {
      id: reg.id,
      bookingNumber: reg.bookingNumber,
      campaignTitle: reg.campaign.title,
      campaignSlug: reg.campaign.slug,
      sessionDate: reg.session.sessionDate.toISOString().split('T')[0],
      petCount: reg.petBookings.length,
      status: reg.status,
      paymentStatus: reg.payment?.status ?? null,
      totalAmountBdt: decimalToNumber(reg.totalAmountBdt),
      hasCertificate: !!cert,
      certificateNumber: cert?.certificateNumber ?? null,
      verifyToken: cert?.verifyToken ?? null,
      createdAt: reg.createdAt,
    };
  });

  const upcomingCount = bookingItems.filter((b) =>
    ['pending_payment', 'paid', 'checked_in'].includes(b.status),
  ).length;

  // 4. Build contribution items ─────────────────────────────────────────────

  const contribItems: DashboardContributionItem[] = careContributions.map((c) => ({
    id: c.id,
    contributionNumber: c.contributionNumber,
    amountBdt: decimalToNumber(c.amountBdt),
    status: c.status,
    planTitle: c.plan.title,
    zoneName: c.zone.name,
    zoneSlug: c.zone.slug,
    createdAt: c.createdAt,
  }));

  const paidContribs = careContributions.filter((c) => c.status === 'paid');
  const totalContribAmount = paidContribs.reduce(
    (sum, c) => sum + decimalToNumber(c.amountBdt),
    0,
  );

  // Group by zone
  const zoneMap = new Map<string, { zoneName: string; amount: number; count: number }>();
  for (const c of paidContribs) {
    const existing = zoneMap.get(c.zone.slug);
    if (existing) {
      existing.amount += decimalToNumber(c.amountBdt);
      existing.count += 1;
    } else {
      zoneMap.set(c.zone.slug, {
        zoneName: c.zone.name,
        amount: decimalToNumber(c.amountBdt),
        count: 1,
      });
    }
  }

  // 5. Care Partner Card ────────────────────────────────────────────────────

  const activeCard = careContributions.find((c) => c.card?.status === 'active')?.card
    ?? careContributions.find((c) => c.card)?.card
    ?? null;

  let carePartnerCard: DashboardCarePartnerCardSection | null = null;
  if (activeCard) {
    carePartnerCard = {
      cardId: activeCard.id,
      cardNumber: activeCard.cardNumber,
      status: activeCard.status,
      qrToken: activeCard.qrToken,
      verifyUrl: frontendUrl(`/verify/care-card/${activeCard.qrToken}`),
      issuedAt: activeCard.issuedAt?.toISOString() ?? null,
      expiresAt: activeCard.expiresAt?.toISOString().split('T')[0] ?? null,
      zone: activeCard.zone.name,
      zoneSlug: activeCard.zone.slug,
    };
  }

  // 6. Community Membership ─────────────────────────────────────────────────

  let membershipSection: DashboardMembershipSection | null = null;
  if (communityMembership) {
    const memCard = communityMembership.card;
    membershipSection = {
      purchaseId: communityMembership.id,
      tierName: communityMembership.tier.nameEn,
      tierSlug: communityMembership.tier.slug,
      status: communityMembership.status,
      amountBdt: decimalToNumber(communityMembership.amountBdt),
      startedAt: communityMembership.startsAt?.toISOString().split('T')[0] ?? null,
      expiresAt: communityMembership.expiresAt?.toISOString().split('T')[0] ?? null,
      renewalDate: communityMembership.expiresAt?.toISOString().split('T')[0] ?? null,
      canUpgrade: communityMembership.status === 'paid',
      petLimit: communityMembership.petLimit,
      cardNumber: memCard?.cardNumber ?? null,
      cardStatus: memCard?.status ?? null,
      cardQrToken: memCard?.qrToken ?? null,
      verifyUrl: memCard ? frontendUrl(`/verify/membership-card/${memCard.qrToken}`) : null,
      preferredZone: communityMembership.preferredZone?.name ?? null,
    };
  }

  // 7. Impact score ─────────────────────────────────────────────────────────

  const vaccinatedPets = allPets.filter((p) => p.vaccinationRecords.length > 0).length;
  const allCertificates = allRegistrations.flatMap((r) =>
    r.petBookings.flatMap((pb) => pb.certificates),
  );
  const uniqueCampaigns = new Set(allRegistrations.map((r) => r.campaign.slug)).size;

  // Simple scoring: 100 pts per campaign, 50 per cert, 50 per paid contrib, 25 per pet
  const impactScore =
    uniqueCampaigns * 100 +
    allCertificates.length * 50 +
    paidContribs.length * 50 +
    allPets.length * 25;

  const impact: DashboardImpactSection = {
    score: impactScore,
    vaccinatedPets,
    supportedAnimals: vaccinatedPets,
    certificatesIssued: allCertificates.length,
    campaignsParticipated: uniqueCampaigns,
    contributionsMade: paidContribs.length,
  };

  // 8. Documents list ───────────────────────────────────────────────────────

  const documents: DashboardDocumentItem[] = [];

  // Membership card
  if (communityMembership?.card) {
    const mc = communityMembership.card;
    documents.push({
      id: mc.id,
      type: 'membership_card',
      title: `${communityMembership.tier.nameEn} Membership Card`,
      reference: mc.cardNumber,
      issuedAt: mc.issuedAt?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
      downloadUrl: null,
      verifyUrl: frontendUrl(`/verify/membership-card/${mc.qrToken}`),
    });
  }

  // Vaccination certificates
  for (const reg of allRegistrations) {
    for (const pb of reg.petBookings) {
      for (const cert of pb.certificates) {
        documents.push({
          id: cert.id,
          type: 'vaccination_certificate',
          title: `Vaccination Certificate – ${reg.campaign.title}`,
          reference: cert.certificateNumber,
          issuedAt: cert.issuedAt.toISOString().split('T')[0],
          downloadUrl: null,
          verifyUrl: frontendUrl(`/verify/cert/${cert.verifyToken}`),
        });
      }
    }
  }

  // Care partner card
  if (activeCard) {
    documents.push({
      id: activeCard.id,
      type: 'care_partner_card',
      title: 'Care Partner Card',
      reference: activeCard.cardNumber,
      issuedAt: activeCard.issuedAt?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
      downloadUrl: null,
      verifyUrl: frontendUrl(`/verify/care-card/${activeCard.qrToken}`),
    });
  }

  // 9. Notifications ────────────────────────────────────────────────────────

  const notifications: DashboardNotification[] = [];

  // Membership expiry warning (within 60 days)
  if (membershipSection?.expiresAt) {
    const daysLeft = Math.ceil(
      (new Date(membershipSection.expiresAt).getTime() - Date.now()) / 86400000,
    );
    if (daysLeft <= 60 && daysLeft > 0) {
      notifications.push({
        id: 'notif-membership-renewal',
        type: 'membership_renewal',
        title: 'Membership Renewal Due Soon',
        message: `Your ${membershipSection.tierName} membership expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew to keep your benefits.`,
        priority: daysLeft <= 14 ? 'high' : 'medium',
        actionUrl: frontendUrl('/community-pet-care/contribute'),
      });
    } else if (daysLeft <= 0) {
      notifications.push({
        id: 'notif-membership-expired',
        type: 'membership_renewal',
        title: 'Membership Expired',
        message: 'Your membership has expired. Renew now to restore access to Care Partner benefits.',
        priority: 'high',
        actionUrl: frontendUrl('/community-pet-care/contribute'),
      });
    }
  }

  // Pending payments
  const pendingBookings = bookingItems.filter((b) => b.status === 'pending_payment');
  for (const b of pendingBookings.slice(0, 2)) {
    notifications.push({
      id: `notif-payment-${b.id}`,
      type: 'payment_pending',
      title: 'Payment Pending',
      message: `Payment for campaign booking ${b.bookingNumber} is still pending.`,
      priority: 'high',
      actionUrl: frontendUrl(`/campaigns/${b.campaignSlug}/booking/${b.bookingNumber}`),
    });
  }

  // Certificates ready
  for (const b of bookingItems.filter((bk) => bk.hasCertificate).slice(0, 2)) {
    notifications.push({
      id: `notif-cert-${b.id}`,
      type: 'certificate_ready',
      title: 'Certificate Available',
      message: `Vaccination certificate for booking ${b.bookingNumber} is ready.`,
      priority: 'low',
      actionUrl: frontendUrl(`/campaigns/${b.campaignSlug}/booking/${b.bookingNumber}`),
    });
  }

  // 10. Transparency section ────────────────────────────────────────────────

  const totalRaisedBdt = decimalToNumber(transparencyData._sum.totalCollectedBdt);
  const totalZones = await prisma.communityZone.count();

  const userTotalContrib = totalContribAmount;
  const userContribShare =
    totalRaisedBdt > 0 ? Math.round((userTotalContrib / totalRaisedBdt) * 10000) / 100 : 0;

  const transparency: DashboardTransparencySection = {
    totalRaisedBdt,
    totalContributors: 0, // aggregate not tracked per report
    userContributionShare: userContribShare,
    activeZones: zoneStats._count.id,
    totalZones,
    latestReportTitle: latestReport?.title ?? null,
    latestReportSlug: latestReport?.slug ?? null,
    latestReportPublishedAt: latestReport?.publishedAt?.toISOString() ?? null,
  };

  // 11. Recent activity timeline ────────────────────────────────────────────

  const activities: DashboardActivity[] = [];

  // Campaign registrations
  for (const reg of allRegistrations.slice(0, 5)) {
    activities.push({
      id: `act-reg-${reg.id}`,
      type: 'campaign_registered',
      title: 'Campaign Registration',
      description: `Registered for ${reg.campaign.title}`,
      referenceNumber: reg.bookingNumber,
      occurredAt: reg.createdAt,
    });

    if (reg.payment?.status === 'success') {
      activities.push({
        id: `act-pay-${reg.id}`,
        type: 'payment_verified',
        title: 'Payment Verified',
        description: `Payment confirmed for ${reg.campaign.title}`,
        referenceNumber: reg.bookingNumber,
        occurredAt: reg.updatedAt,
      });
    }

    for (const pb of reg.petBookings) {
      for (const cert of pb.certificates) {
        activities.push({
          id: `act-cert-${cert.id}`,
          type: 'certificate_issued',
          title: 'Vaccination Certificate Issued',
          description: `Certificate issued for ${reg.campaign.title}`,
          referenceNumber: cert.certificateNumber,
          occurredAt: cert.issuedAt,
        });
      }
    }
  }

  // Care contributions
  for (const c of careContributions.slice(0, 3)) {
    activities.push({
      id: `act-contrib-${c.id}`,
      type: c.status === 'paid' ? 'donation_made' : 'payment_submitted',
      title: c.status === 'paid' ? 'Contribution Confirmed' : 'Contribution Submitted',
      description: `Care Partner contribution of ৳${decimalToNumber(c.amountBdt).toLocaleString('en-IN')} for ${c.zone.name}`,
      referenceNumber: c.contributionNumber,
      occurredAt: c.createdAt,
    });
  }

  // Membership purchase
  if (communityMembership) {
    activities.push({
      id: `act-membership-${communityMembership.id}`,
      type: 'membership_purchased',
      title: 'Membership Purchased',
      description: `${communityMembership.tier.nameEn} membership activated`,
      referenceNumber: null,
      occurredAt: communityMembership.purchasedAt ?? new Date(),
    });
  }

  // Sort activities by most recent first
  activities.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  // 12. Build final user section ────────────────────────────────────────────

  const userSection: DashboardUserSection = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    memberId: `BPA-${user.id.slice(0, 8).toUpperCase()}`,
    role: user.role,
    status: user.status,
    joinedAt: user.createdAt,
    profileCompletion: computeProfileCompletion(user),
  };

  const petsSection: DashboardPetsSection = {
    total: allPets.length,
    items: allPets.slice(0, 10).map((p) => ({
      id: p.id,
      name: p.name,
      petType: p.petType,
      gender: p.gender,
      breed: p.breed,
      approxAge: p.approxAge,
      isActive: p.isActive,
    })),
  };

  const bookingsSection: DashboardBookingsSection = {
    total: bookingItems.length,
    upcoming: upcomingCount,
    latest: bookingItems.slice(0, 5),
  };

  const contributionsSection: DashboardContributionsSection = {
    totalAmount: totalContribAmount,
    totalCount: careContributions.length,
    paidCount: paidContribs.length,
    pendingCount: careContributions.filter((c) => c.status === 'pending_payment').length,
    latest: contribItems.slice(0, 5),
    byZone: Array.from(zoneMap.values()),
  };

  return {
    user: userSection,
    membership: membershipSection,
    pets: petsSection,
    bookings: bookingsSection,
    contributions: contributionsSection,
    carePartnerCard,
    impact,
    documents: documents.slice(0, 20),
    notifications: notifications.slice(0, 10),
    transparency,
    recentActivities: activities.slice(0, 12),
  };
}
