import { z } from 'zod';
import { CommunityZoneStatus } from '@prisma/client';

export const createCommunityZoneSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(140).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  city: z.string().max(120).default('Dhaka'),
  district: z.string().max(120).default('Dhaka District'),
  division: z.string().max(120).default('Dhaka'),
  targetContributors: z.number().int().positive().default(10000),
  targetAmountBdt: z.number().positive().default(30000000),
  clinicAddress: z.string().max(500).optional(),
  clinicPhone: z.string().max(20).optional(),
  mapEmbedUrl: z.string().url().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  coverImageId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).default(0),
  status: z.nativeEnum(CommunityZoneStatus).default('active'),
  isActive: z.boolean().default(true),
});

export const updateCommunityZoneSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  slug: z.string().min(2).max(140).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(2000).optional().nullable(),
  city: z.string().max(120).optional(),
  district: z.string().max(120).optional(),
  division: z.string().max(120).optional(),
  targetContributors: z.number().int().positive().optional(),
  targetAmountBdt: z.number().positive().optional(),
  clinicAddress: z.string().max(500).optional().nullable(),
  clinicPhone: z.string().max(20).optional().nullable(),
  mapEmbedUrl: z.string().url().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  coverImageId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  status: z.nativeEnum(CommunityZoneStatus).optional(),
  isActive: z.boolean().optional(),
});

export const communityZoneListQuerySchema = z.object({
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().max(100).optional(),
  status: z.nativeEnum(CommunityZoneStatus).optional(),
  search: z.string().optional(),
});

export type CreateCommunityZoneDto = z.infer<typeof createCommunityZoneSchema>;
export type UpdateCommunityZoneDto = z.infer<typeof updateCommunityZoneSchema>;
export type CommunityZoneListQuery = z.infer<typeof communityZoneListQuerySchema>;
