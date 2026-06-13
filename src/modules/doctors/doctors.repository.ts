import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { parsePaginationQuery, buildPaginationMeta } from '../../utils/response';
import type { CreateDoctorDto, UpdateDoctorDto, DoctorListQuery } from './doctors.types';

export async function createDoctor(dto: CreateDoctorDto) {
  return prisma.doctor.create({ data: dto });
}

export async function listDoctors(query: DoctorListQuery) {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit);
  const where: Prisma.DoctorWhereInput = {};
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { licenseNumber: { contains: query.search, mode: 'insensitive' } },
      { specialization: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.doctor.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.doctor.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta(total, page, limit) };
}

export async function getDoctorById(id: string) {
  return prisma.doctor.findUnique({ where: { id } });
}

export async function updateDoctor(id: string, dto: UpdateDoctorDto) {
  return prisma.doctor.update({ where: { id }, data: dto });
}

export async function softDeleteDoctor(id: string) {
  return prisma.doctor.update({ where: { id }, data: { isActive: false } });
}
