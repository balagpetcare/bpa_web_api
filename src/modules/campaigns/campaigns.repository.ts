import { CampaignStatus, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/response';
import type {
  CreateCampaignDto, UpdateCampaignDto, CampaignListQuery,
  CreateSessionDto, UpdateSessionDto,
  CreateServiceDto, UpdateServiceDto,
  AssignDoctorDto, UpdateDoctorAssignmentDto, BulkAssignDoctorDto, AssignVolunteerDto,
} from './campaigns.types';

const campaignInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  coverImage: { select: { id: true, url: true, altText: true } },
  _count: { select: { sessions: true, services: true, doctors: true, volunteers: true, registrations: true } },
  media: {
    where: { role: { in: ['thumbnail', 'hero', 'mobile_banner'] } } as any,
    orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }] as any,
    include: { mediaFile: { select: { id: true, url: true, mimeType: true } } },
    take: 3,
  },
  // Minimal service pricing included on list so cards can show discount
  services: {
    select: { id: true, priceBdt: true },
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

const campaignDetailInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  coverImage: { select: { id: true, url: true, altText: true } },
  certificateTemplate: { select: { id: true, name: true } },
  media: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }] as any,
    include: { mediaFile: { select: { id: true, url: true, mimeType: true, sizeBytes: true, originalName: true } } },
  },
  sessions: {
    include: {
      venue: {
        select: {
          id: true, name: true, address: true, googleMapsUrl: true,
          latitude: true, longitude: true,
          zone: { include: { cityCorporation: true } },
        },
      },
    },
    orderBy: { sessionDate: 'asc' as const },
  },
  services: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      vaccineCatalog: {
        select: { id: true, name: true, description: true, species: true, standardIntervalDays: true, manufacturer: true },
      },
    },
  },
  doctors: { include: { doctor: { select: { id: true, name: true, licenseNumber: true } } } },
  volunteers: { include: { user: { select: { id: true, name: true, email: true } } } },
} as const;

// ─── Campaign CRUD ───────────────────────────────────────────────

export async function createCampaign(dto: CreateCampaignDto, slug: string, createdById: string) {
  return prisma.campaign.create({
    data: {
      slug,
      createdById,
      title: dto.title,
      description: dto.description,
      campaignType: dto.campaignType,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      registrationOpenAt: dto.registrationOpenAt ? new Date(dto.registrationOpenAt) : undefined,
      registrationCloseAt: dto.registrationCloseAt ? new Date(dto.registrationCloseAt) : undefined,
      basePriceBdt: dto.basePriceBdt,
      maxPetsPerBooking: dto.maxPetsPerBooking,
      certificateTemplateId: dto.certificateTemplateId,
      coverImageId: dto.coverImageId,
      metadata: dto.metadata as Prisma.InputJsonValue ?? Prisma.JsonNull,
      isFeatured: dto.isFeatured,
      allowedPetTypes: dto.allowedPetTypes ?? [],
      termsAndConditions: dto.termsAndConditions,
      faq: dto.faq as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
    include: campaignInclude,
  });
}

export async function listCampaigns(query: CampaignListQuery) {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit);
  const where: Prisma.CampaignWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.campaignType) where.campaignType = query.campaignType;
  if (query.search) where.title = { contains: query.search, mode: 'insensitive' };
  const [items, total] = await Promise.all([
    prisma.campaign.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: campaignInclude }),
    prisma.campaign.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function listFeaturedCampaigns() {
  const now = new Date();
  // Only campaigns whose registration window is still open (or has no close date set)
  const activeRegistrationFilter = {
    status: CampaignStatus.registration_open,
    OR: [
      { registrationCloseAt: null },
      { registrationCloseAt: { gt: now } },
    ],
  } satisfies Prisma.CampaignWhereInput;

  const [featured, registrationOpen, upcoming] = await Promise.all([
    prisma.campaign.findMany({
      where: { isFeatured: true, ...activeRegistrationFilter },
      orderBy: { startDate: 'asc' },
      take: 3,
      include: campaignInclude,
    }),
    prisma.campaign.findMany({
      where: activeRegistrationFilter,
      orderBy: { registrationCloseAt: 'asc' },
      take: 6,
      include: campaignInclude,
    }),
    prisma.campaign.findMany({
      where: { status: CampaignStatus.published, startDate: { gte: now } },
      orderBy: { startDate: 'asc' },
      take: 6,
      include: campaignInclude,
    }),
  ]);
  return { featured, registrationOpen, upcoming };
}

export async function getCampaignById(id: string) {
  return prisma.campaign.findUnique({ where: { id }, include: campaignDetailInclude });
}

export async function getCampaignBySlug(slug: string) {
  return prisma.campaign.findUnique({ where: { slug }, include: campaignDetailInclude });
}

export async function updateCampaign(id: string, dto: UpdateCampaignDto) {
  const data: Prisma.CampaignUpdateInput = {
    title: dto.title,
    slug: dto.slug,
    description: dto.description,
    campaignType: dto.campaignType,
    basePriceBdt: dto.basePriceBdt,
    maxPetsPerBooking: dto.maxPetsPerBooking,
    ...(dto.certificateTemplateId !== undefined && {
      certificateTemplate: dto.certificateTemplateId
        ? { connect: { id: dto.certificateTemplateId } }
        : { disconnect: true },
    }),
    ...(dto.coverImageId !== undefined && {
      coverImage: dto.coverImageId
        ? { connect: { id: dto.coverImageId } }
        : { disconnect: true },
    }),
  };
  if (dto.startDate) data.startDate = new Date(dto.startDate);
  if (dto.endDate) data.endDate = new Date(dto.endDate);
  if (dto.registrationOpenAt !== undefined) data.registrationOpenAt = dto.registrationOpenAt ? new Date(dto.registrationOpenAt) : null;
  if (dto.registrationCloseAt !== undefined) data.registrationCloseAt = dto.registrationCloseAt ? new Date(dto.registrationCloseAt) : null;
  if (dto.metadata !== undefined) data.metadata = (dto.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue;
  if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
  if (dto.allowedPetTypes !== undefined) data.allowedPetTypes = dto.allowedPetTypes;
  if (dto.termsAndConditions !== undefined) data.termsAndConditions = dto.termsAndConditions;
  if (dto.faq !== undefined) data.faq = (dto.faq ?? Prisma.JsonNull) as Prisma.InputJsonValue;
  return prisma.campaign.update({ where: { id }, data, include: campaignInclude });
}

export async function updateCampaignStatus(id: string, status: CampaignStatus) {
  return prisma.campaign.update({ where: { id }, data: { status }, include: campaignInclude });
}

export async function deleteCampaign(id: string) {
  return prisma.campaign.delete({ where: { id } });
}

// ─── Sessions ────────────────────────────────────────────────────

export async function createSession(campaignId: string, dto: CreateSessionDto) {
  return prisma.campaignSession.create({
    data: {
      campaignId,
      venueId: dto.venueId,
      sessionDate: new Date(dto.sessionDate),
      startTime: dto.startTime,
      endTime: dto.endTime,
      capacity: dto.capacity,
      notes: dto.notes,
    },
    include: { venue: { include: { zone: { include: { cityCorporation: true } } } } },
  });
}

export async function listSessions(campaignId: string) {
  return prisma.campaignSession.findMany({
    where: { campaignId },
    orderBy: { sessionDate: 'asc' },
    include: { venue: { include: { zone: { include: { cityCorporation: true } } } } },
  });
}

export async function getSessionById(id: string) {
  return prisma.campaignSession.findUnique({
    where: { id },
    include: { venue: { include: { zone: true } } },
  });
}

export async function updateSession(id: string, dto: UpdateSessionDto) {
  const data: Prisma.CampaignSessionUpdateInput = { ...dto };
  if (dto.sessionDate) data.sessionDate = new Date(dto.sessionDate);
  return prisma.campaignSession.update({ where: { id }, data });
}

export async function deleteSession(id: string) {
  return prisma.campaignSession.delete({ where: { id } });
}

// ─── Services ────────────────────────────────────────────────────

export async function createService(campaignId: string, dto: CreateServiceDto) {
  return prisma.campaignService.create({
    data: {
      campaignId,
      name: dto.name,
      description: dto.description,
      vaccineCatalogId: dto.vaccineCatalogId,
      isRequired: dto.isRequired,
      sortOrder: dto.sortOrder,
      priceBdt: dto.priceBdt,
    },
    include: { vaccineCatalog: { select: { id: true, name: true } } },
  });
}

export async function listServices(campaignId: string) {
  return prisma.campaignService.findMany({
    where: { campaignId },
    orderBy: { sortOrder: 'asc' },
    include: { vaccineCatalog: { select: { id: true, name: true } } },
  });
}

export async function getServiceById(id: string) {
  return prisma.campaignService.findUnique({ where: { id } });
}

export async function updateService(id: string, dto: UpdateServiceDto) {
  return prisma.campaignService.update({
    where: { id },
    data: {
      name: dto.name,
      description: dto.description,
      vaccineCatalogId: dto.vaccineCatalogId,
      isRequired: dto.isRequired,
      sortOrder: dto.sortOrder,
      priceBdt: dto.priceBdt,
    },
    include: { vaccineCatalog: { select: { id: true, name: true } } },
  });
}

export async function deleteService(id: string) {
  return prisma.campaignService.delete({ where: { id } });
}

// ─── Doctor Assignment ────────────────────────────────────────────

const doctorAssignmentInclude = {
  doctor: { select: { id: true, name: true, licenseNumber: true, specialization: true, mobile: true, email: true, photoUrl: true } },
  session: { select: { id: true, sessionDate: true, startTime: true, endTime: true, venue: { select: { name: true } } } },
} as const;

export async function assignDoctor(campaignId: string, dto: AssignDoctorDto, assignedBy?: string) {
  return prisma.campaignDoctor.create({
    data: {
      campaignId,
      doctorId: dto.doctorId,
      sessionId: dto.sessionId ?? null,
      role: dto.role,
      doctorDuty: dto.doctorDuty,
      isSigningDoctor: dto.isSigningDoctor ?? false,
      isPrimarySupervisor: dto.isPrimarySupervisor ?? false,
      assignedDate: dto.assignedDate,
      notes: dto.notes ?? null,
      assignedBy: assignedBy ?? null,
    },
    include: doctorAssignmentInclude,
  });
}

export async function listCampaignDoctors(campaignId: string, sessionId?: string) {
  return prisma.campaignDoctor.findMany({
    where: { campaignId, ...(sessionId ? { sessionId } : {}) },
    include: doctorAssignmentInclude,
    orderBy: [{ isSigningDoctor: 'desc' }, { doctorDuty: 'asc' }, { createdAt: 'desc' }],
  });
}

export async function updateDoctorAssignment(id: string, dto: UpdateDoctorAssignmentDto) {
  return prisma.campaignDoctor.update({
    where: { id },
    data: {
      ...(dto.role && { role: dto.role }),
      ...(dto.doctorDuty && { doctorDuty: dto.doctorDuty }),
      ...(dto.isSigningDoctor !== undefined && { isSigningDoctor: dto.isSigningDoctor }),
      ...(dto.isPrimarySupervisor !== undefined && { isPrimarySupervisor: dto.isPrimarySupervisor }),
      ...(dto.assignedDate && { assignedDate: dto.assignedDate }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    },
    include: doctorAssignmentInclude,
  });
}

export async function deleteDoctorAssignmentById(id: string) {
  return prisma.campaignDoctor.delete({ where: { id } });
}

export async function removeDoctorAssignment(campaignId: string, doctorId: string) {
  const first = await prisma.campaignDoctor.findFirst({ where: { campaignId, doctorId } });
  if (first) await prisma.campaignDoctor.delete({ where: { id: first.id } });
}

export async function bulkAssignDoctors(campaignId: string, dto: BulkAssignDoctorDto, assignedBy?: string) {
  const results = [];
  for (const item of dto.assignments) {
    const record = await prisma.campaignDoctor.create({
      data: {
        campaignId,
        doctorId: item.doctorId,
        sessionId: item.sessionId ?? null,
        role: item.doctorDuty.toLowerCase(),
        doctorDuty: item.doctorDuty,
        isSigningDoctor: item.isSigningDoctor ?? false,
        isPrimarySupervisor: item.isPrimarySupervisor ?? false,
        notes: item.notes ?? null,
        assignedBy: assignedBy ?? null,
      },
    });
    results.push(record);
  }
  return results;
}

// ─── Volunteer Assignment ─────────────────────────────────────────

export async function assignVolunteer(campaignId: string, dto: AssignVolunteerDto) {
  return prisma.campaignVolunteer.create({
    data: { campaignId, userId: dto.userId, sessionId: dto.sessionId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function listCampaignVolunteers(campaignId: string) {
  return prisma.campaignVolunteer.findMany({
    where: { campaignId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function removeVolunteerAssignment(campaignId: string, userId: string) {
  return prisma.campaignVolunteer.delete({ where: { campaignId_userId: { campaignId, userId } } });
}
