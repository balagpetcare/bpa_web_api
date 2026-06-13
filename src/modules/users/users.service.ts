import { prisma } from '../../database/prisma';
import { hashPassword } from '../../utils/hash';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta, parsePaginationQuery } from '../../utils/response';
import { PaginationMeta } from '../../types';
import { CreateUserDto, UpdateUserDto, UserListQuery, UserResponse } from './users.types';

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  userRoles: { select: { role: { select: { name: true } } } },
} as const;

function format(u: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userRoles: Array<{ role: { name: string } }>;
}): UserResponse {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    isActive: u.isActive,
    roles: u.userRoles.map((ur) => ur.role.name),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export async function listUsers(
  query: UserListQuery,
): Promise<{ data: UserResponse[]; meta: PaginationMeta }> {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit);

  const where = {
    deletedAt: null,
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: userSelect, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);

  return { data: users.map(format), meta: buildPaginationMeta(total, page, limit) };
}

export async function getUserById(id: string): Promise<UserResponse> {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: userSelect,
  });
  if (!user) throw AppError.notFound('User');
  return format(user);
}

export async function createUser(dto: CreateUserDto): Promise<UserResponse> {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } });
  if (existing) throw AppError.conflict('A user with this email already exists');

  const passwordHash = await hashPassword(dto.password);

  const user = await prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      passwordHash,
      phone: dto.phone,
      userRoles: dto.roleIds?.length
        ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
        : undefined,
    },
    select: userSelect,
  });

  return format(user);
}

export async function updateUser(id: string, dto: UpdateUserDto): Promise<UserResponse> {
  const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw AppError.notFound('User');

  if (dto.email && dto.email !== existing.email) {
    const conflict = await prisma.user.findUnique({ where: { email: dto.email } });
    if (conflict) throw AppError.conflict('Email already in use');
  }

  const passwordHash = dto.password ? await hashPassword(dto.password) : undefined;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(passwordHash !== undefined && { passwordHash }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.roleIds !== undefined && {
        userRoles: {
          deleteMany: {},
          create: dto.roleIds.map((roleId) => ({ roleId })),
        },
      }),
    },
    select: userSelect,
  });

  return format(user);
}

export async function deleteUser(id: string): Promise<void> {
  const existing = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw AppError.notFound('User');

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
