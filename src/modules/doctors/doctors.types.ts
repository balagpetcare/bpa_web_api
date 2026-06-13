import { z } from 'zod';

export const createDoctorSchema = z.object({
  name: z.string().min(1).max(120),
  licenseNumber: z.string().min(1).max(80),
  specialization: z.string().max(120).optional(),
  mobile: z.string().max(20).optional(),
  email: z.string().email().max(255).optional(),
  userId: z.string().uuid().optional(),
});

export const updateDoctorSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  licenseNumber: z.string().min(1).max(80).optional(),
  specialization: z.string().max(120).optional().nullable(),
  mobile: z.string().max(20).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const doctorListQuerySchema = z.object({
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().max(100).optional(),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export type CreateDoctorDto = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorDto = z.infer<typeof updateDoctorSchema>;
export type DoctorListQuery = z.infer<typeof doctorListQuerySchema>;
