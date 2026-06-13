import { CampaignStatus, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/response';
import type {
  CreateCampaignDto, UpdateCampaignDto, CampaignListQuery,
  CreateSessionDto, UpdateSessionDto,
  CreateServiceDto, UpdateServiceDto,
  AssignDoctorDto, AssignVolunteerDto,
} from './campaigns.types';

const campaignInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  coverImage: { select: { id: true, url: true, altText: true } },
  _count: { select: { sessions: true, services: true, doctors: true, volunteers: true } },
} as const;

const campaignDetailInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  coverImage: { select: { id: true, url: true, altText: true } },
  certificateTemplate: { select: { id: true, name: true } },
  media: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }] as any,
    include: { mediaFile: { select: { id: true, url: true, mimeType: true } } },
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
  const [featured, registrationOpen, upcoming] = await Promise.all([
    prisma.campaign.findMany({
      where: { isFeatured: true, status: { notIn: ['draft', 'cancelled'] } },
      orderBy: { startDate: 'asc' },
      take: 3,
      include: campaignInclude,
    }),
    prisma.campaign.findMany({
      where: { status: 'registration_open' },
      orderBy: { registrationCloseAt: 'asc' },
      take: 6,
      include: campaignInclude,
    }),
    prisma.campaign.findMany({
      where: { status: 'published', startDate: { gte: now } },
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
    data: { campaignId, ...dto },
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
    data: dto,
    include: { vaccineCatalog: { select: { id: true, name: true } } },
  });
}

export async function deleteService(id: string) {
  return prisma.campaignService.delete({ where: { id } });
}

// ─── Doctor Assignment ────────────────────────────────────────────

export async function assignDoctor(campaignId: string, dto: AssignDoctorDto) {
  return prisma.campaignDoctor.create({
    data: { campaignId, doctorId: dto.doctorId, sessionId: dto.sessionId },
    include: { doctor: { select: { id: true, name: true, licenseNumber: true } } },
  });
}

export async function listCampaignDoctors(campaignId: string) {
  return prisma.campaignDoctor.findMany({
    where: { campaignId },
    include: { doctor: { select: { id: true, name: true, licenseNumber: true, specialization: true } } },
  });
}

export async function removeDoctorAssignment(campaignId: string, doctorId: string) {
  return prisma.campaignDoctor.delete({ where: { campaignId_doctorId: { campaignId, doctorId } } });
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
