import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/response';
import type {
  CreateCountryDto, UpdateCountryDto,
  CreateDivisionDto, UpdateDivisionDto,
  CreateDistrictDto, UpdateDistrictDto,
  CreateCityCorporationDto, UpdateCityCorporationDto,
  CreateZoneDto, UpdateZoneDto,
  CreateVenueDto, UpdateVenueDto,
  LocationListQuery,
} from './locations.types';

// ─── Countries ───────────────────────────────────────────────────

export async function createCountry(dto: CreateCountryDto) {
  return prisma.country.create({ data: dto });
}

export async function listCountries(query: LocationListQuery) {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit, 100);
  const where: Prisma.CountryWhereInput = {};
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
  const [items, total] = await Promise.all([
    prisma.country.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.country.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function getCountryById(id: string) {
  return prisma.country.findUnique({ where: { id } });
}

export async function updateCountry(id: string, dto: UpdateCountryDto) {
  return prisma.country.update({ where: { id }, data: dto });
}

export async function countDivisionsByCountry(countryId: string) {
  return prisma.division.count({ where: { countryId } });
}

export async function findDivisionByNameAndCountry(name: string, countryId: string) {
  return prisma.division.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, countryId } });
}

export async function deleteCountry(id: string) {
  return prisma.country.delete({ where: { id } });
}

// ─── Divisions ───────────────────────────────────────────────────

export async function createDivision(dto: CreateDivisionDto) {
  return prisma.division.create({ data: dto, include: { country: true } });
}

export async function listDivisions(query: LocationListQuery) {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit, 100);
  const where: Prisma.DivisionWhereInput = {};
  if (query.countryId) where.countryId = query.countryId;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
  const [items, total] = await Promise.all([
    prisma.division.findMany({ where, skip, take: limit, orderBy: { name: 'asc' }, include: { country: { select: { id: true, name: true } } } }),
    prisma.division.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function getDivisionById(id: string) {
  return prisma.division.findUnique({ where: { id }, include: { country: true } });
}

export async function updateDivision(id: string, dto: UpdateDivisionDto) {
  return prisma.division.update({ where: { id }, data: dto });
}

export async function countDistrictsByDivision(divisionId: string) {
  return prisma.district.count({ where: { divisionId } });
}

export async function findDistrictByNameAndDivision(name: string, divisionId: string) {
  return prisma.district.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, divisionId } });
}

export async function deleteDivision(id: string) {
  return prisma.division.delete({ where: { id } });
}

// ─── Districts ───────────────────────────────────────────────────

export async function createDistrict(dto: CreateDistrictDto) {
  return prisma.district.create({ data: dto, include: { division: { include: { country: true } } } });
}

export async function listDistricts(query: LocationListQuery) {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit, 100);
  const where: Prisma.DistrictWhereInput = {};
  if (query.divisionId) where.divisionId = query.divisionId;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
  const [items, total] = await Promise.all([
    prisma.district.findMany({ where, skip, take: limit, orderBy: { name: 'asc' }, include: { division: { select: { id: true, name: true } } } }),
    prisma.district.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function getDistrictById(id: string) {
  return prisma.district.findUnique({ where: { id }, include: { division: true } });
}

export async function updateDistrict(id: string, dto: UpdateDistrictDto) {
  return prisma.district.update({ where: { id }, data: dto });
}

export async function countCityCorporationsByDistrict(districtId: string) {
  return prisma.cityCorporation.count({ where: { districtId } });
}

export async function findCityCorporationByNameAndDistrict(name: string, districtId: string) {
  return prisma.cityCorporation.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, districtId } });
}

export async function deleteDistrict(id: string) {
  return prisma.district.delete({ where: { id } });
}

// ─── City Corporations ───────────────────────────────────────────

export async function createCityCorporation(dto: CreateCityCorporationDto) {
  return prisma.cityCorporation.create({ data: dto, include: { district: true } });
}

export async function listCityCorporations(query: LocationListQuery) {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit, 100);
  const where: Prisma.CityCorporationWhereInput = {};
  if (query.districtId) where.districtId = query.districtId;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
  const [items, total] = await Promise.all([
    prisma.cityCorporation.findMany({ where, skip, take: limit, orderBy: { name: 'asc' }, include: { district: { select: { id: true, name: true } } } }),
    prisma.cityCorporation.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function getCityCorporationById(id: string) {
  return prisma.cityCorporation.findUnique({ where: { id }, include: { district: true } });
}

export async function updateCityCorporation(id: string, dto: UpdateCityCorporationDto) {
  return prisma.cityCorporation.update({ where: { id }, data: dto });
}

export async function countZonesByCityCorporation(cityCorporationId: string) {
  return prisma.zone.count({ where: { cityCorporationId } });
}

export async function deleteCityCorporation(id: string) {
  return prisma.cityCorporation.delete({ where: { id } });
}

// ─── Zones ───────────────────────────────────────────────────────

export async function createZone(dto: CreateZoneDto) {
  return prisma.zone.create({ data: dto, include: { cityCorporation: true } });
}

export async function listZones(query: LocationListQuery) {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit, 100);
  const where: Prisma.ZoneWhereInput = {};
  if (query.cityCorporationId) where.cityCorporationId = query.cityCorporationId;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
  const [items, total] = await Promise.all([
    prisma.zone.findMany({ where, skip, take: limit, orderBy: { name: 'asc' }, include: { cityCorporation: { select: { id: true, name: true } } } }),
    prisma.zone.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function getZoneById(id: string) {
  return prisma.zone.findUnique({ where: { id }, include: { cityCorporation: true } });
}

export async function updateZone(id: string, dto: UpdateZoneDto) {
  return prisma.zone.update({ where: { id }, data: dto });
}

export async function countVenuesByZone(zoneId: string) {
  return prisma.venue.count({ where: { zoneId } });
}

export async function findZoneByNameAndCityCorporation(name: string, cityCorporationId: string) {
  return prisma.zone.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, cityCorporationId } });
}

export async function findVenueByNameAndZone(name: string, zoneId: string) {
  return prisma.venue.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, zoneId } });
}

export async function deleteZone(id: string) {
  return prisma.zone.delete({ where: { id } });
}

// ─── Venues ──────────────────────────────────────────────────────

export async function createVenue(dto: CreateVenueDto) {
  return prisma.venue.create({
    data: {
      name: dto.name,
      address: dto.address,
      zoneId: dto.zoneId,
      googleMapsUrl: dto.googleMapsUrl,
      latitude: dto.latitude,
      longitude: dto.longitude,
    },
    include: { zone: { include: { cityCorporation: { include: { district: { include: { division: true } } } } } } },
  });
}

export async function listVenues(query: LocationListQuery) {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit, 50);
  const where: Prisma.VenueWhereInput = {};
  if (query.zoneId) where.zoneId = query.zoneId;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  if (query.search) where.name = { contains: query.search, mode: 'insensitive' };
  if (query.cityCorporationId) where.zone = { cityCorporationId: query.cityCorporationId };
  const [items, total] = await Promise.all([
    prisma.venue.findMany({
      where, skip, take: limit, orderBy: { name: 'asc' },
      include: { zone: { select: { id: true, name: true, cityCorporation: { select: { id: true, name: true } } } } },
    }),
    prisma.venue.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function getVenueById(id: string) {
  return prisma.venue.findUnique({
    where: { id },
    include: { zone: { include: { cityCorporation: { include: { district: { include: { division: { include: { country: true } } } } } } } } },
  });
}

export async function updateVenue(id: string, dto: UpdateVenueDto) {
  return prisma.venue.update({ where: { id }, data: dto });
}

export async function countSessionsByVenue(venueId: string) {
  return prisma.campaignSession.count({ where: { venueId } });
}

export async function deleteVenue(id: string) {
  return prisma.venue.delete({ where: { id } });
}

// ─── Public hierarchy ─────────────────────────────────────────────

export async function getPublicHierarchy() {
  return prisma.country.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      divisions: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
          districts: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
            include: {
              cityCorporations: {
                where: { isActive: true },
                orderBy: { name: 'asc' },
                include: {
                  zones: {
                    where: { isActive: true },
                    orderBy: { name: 'asc' },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function listPublicVenues(query: LocationListQuery) {
  const where: Prisma.VenueWhereInput = { isActive: true };
  if (query.zoneId) where.zoneId = query.zoneId;
  if (query.cityCorporationId) where.zone = { cityCorporationId: query.cityCorporationId };
  return prisma.venue.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { zone: { select: { id: true, name: true, cityCorporation: { select: { id: true, name: true } } } } },
  });
}
