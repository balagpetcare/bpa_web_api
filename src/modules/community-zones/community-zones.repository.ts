import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/response';
import type { CreateCommunityZoneDto, UpdateCommunityZoneDto, CommunityZoneListQuery } from './community-zones.types';

const zoneInclude = {
  coverImage: { select: { id: true, url: true, altText: true } },
} as const;

export async function createZone(dto: CreateCommunityZoneDto) {
  return prisma.communityZone.create({
    data: {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      city: dto.city,
      district: dto.district,
      division: dto.division,
      targetContributors: dto.targetContributors,
      targetAmountBdt: dto.targetAmountBdt,
      clinicAddress: dto.clinicAddress,
      clinicPhone: dto.clinicPhone,
      mapEmbedUrl: dto.mapEmbedUrl,
      latitude: dto.latitude,
      longitude: dto.longitude,
      coverImageId: dto.coverImageId,
      sortOrder: dto.sortOrder,
      status: dto.status,
      isActive: dto.isActive,
    },
    include: zoneInclude,
  });
}

export async function listZones(query: CommunityZoneListQuery) {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit);
  const where: Prisma.CommunityZoneWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
  const [items, total] = await Promise.all([
    prisma.communityZone.findMany({ where, skip, take: limit, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: zoneInclude }),
    prisma.communityZone.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function listActiveZonesPublic() {
  return prisma.communityZone.findMany({
    where: { isActive: true, status: 'active' },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { coverImage: { select: { id: true, url: true, altText: true } } },
  });
}

export async function getZoneById(id: string) {
  return prisma.communityZone.findUnique({ where: { id }, include: zoneInclude });
}

export async function getZoneBySlug(slug: string) {
  return prisma.communityZone.findUnique({ where: { slug }, include: zoneInclude });
}

export async function updateZone(id: string, dto: UpdateCommunityZoneDto) {
  const data: Prisma.CommunityZoneUpdateInput = { ...dto };
  return prisma.communityZone.update({ where: { id }, data, include: zoneInclude });
}

export async function deleteZone(id: string) {
  return prisma.communityZone.delete({ where: { id } });
}
