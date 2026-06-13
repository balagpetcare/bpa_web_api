import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/response';
import type { SubmitCensusDto, UpdateCensusDto, CensusListQuery } from './pet-census.types';

const censusInclude = {
  zone: { select: { id: true, name: true } },
} as const;

export async function createSubmission(dto: SubmitCensusDto, ipAddress?: string, userAgent?: string) {
  return prisma.petCensusSubmission.create({
    data: {
      ownerName: dto.ownerName,
      ownerMobile: dto.ownerMobile,
      ownerEmail: dto.ownerEmail,
      ownerAddress: dto.ownerAddress,
      zoneId: dto.zoneId,
      areaText: dto.areaText,
      petType: dto.petType,
      petCount: dto.petCount,
      breed: dto.breed,
      petCountDog: dto.petCountDog,
      petCountCat: dto.petCountCat,
      petCountOther: dto.petCountOther,
      petsJson: dto.petsJson as Prisma.InputJsonValue ?? Prisma.JsonNull,
      isVaccinationInterested: dto.isVaccinationInterested,
      isClinicInterested: dto.isClinicInterested,
      isPetShopInterested: dto.isPetShopInterested,
      isCarePartnerInterested: dto.isCarePartnerInterested,
      hasConsented: dto.hasConsented,
      notes: dto.notes,
      source: dto.source,
      sourceRoute: dto.sourceRoute,
      ipAddress,
      userAgent,
    },
    include: censusInclude,
  });
}

export async function findRecentSimilarSubmission(dto: SubmitCensusDto) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return prisma.petCensusSubmission.findFirst({
    where: {
      ownerMobile: dto.ownerMobile,
      petType: dto.petType,
      petCount: dto.petCount,
      submittedAt: { gte: since },
    },
    orderBy: { submittedAt: 'desc' },
    select: { id: true, submittedAt: true, status: true },
  });
}

export async function listSubmissions(query: CensusListQuery) {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit);
  const where: Prisma.PetCensusSubmissionWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.zoneId) where.zoneId = query.zoneId;
  if (query.petType) where.petType = query.petType;
  if (query.area) where.areaText = { contains: query.area, mode: 'insensitive' };
  if (query.vaccinationInterest !== undefined) where.isVaccinationInterested = query.vaccinationInterest;
  if (query.communityClinicInterest !== undefined) where.isClinicInterested = query.communityClinicInterest;
  if (query.communityPetShopInterest !== undefined) where.isPetShopInterested = query.communityPetShopInterest;
  if (query.carePartnerInterest !== undefined) where.isCarePartnerInterested = query.carePartnerInterest;
  if (query.dateFrom || query.dateTo) {
    where.submittedAt = {
      ...(query.dateFrom ? { gte: query.dateFrom } : {}),
      ...(query.dateTo ? { lte: query.dateTo } : {}),
    };
  }
  if (query.search) {
    where.OR = [
      { ownerName: { contains: query.search, mode: 'insensitive' } },
      { ownerMobile: { contains: query.search } },
      { ownerEmail: { contains: query.search, mode: 'insensitive' } },
      { areaText: { contains: query.search, mode: 'insensitive' } },
      { breed: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.petCensusSubmission.findMany({ where, skip, take: limit, orderBy: { submittedAt: 'desc' }, include: censusInclude }),
    prisma.petCensusSubmission.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function getSubmissionById(id: string) {
  return prisma.petCensusSubmission.findUnique({ where: { id }, include: censusInclude });
}

export async function updateSubmission(id: string, dto: UpdateCensusDto) {
  return prisma.petCensusSubmission.update({ where: { id }, data: dto, include: censusInclude });
}

export async function deleteSubmission(id: string) {
  return prisma.petCensusSubmission.delete({ where: { id } });
}

export async function listSubmissionsForExport(query: CensusListQuery) {
  const result = await listSubmissions({ ...query, page: 1, limit: 100 });
  return result.items;
}
