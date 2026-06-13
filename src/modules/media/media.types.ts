import { z } from 'zod';

// ─── DTOs ─────────────────────────────────────────────────────────

export const updateMediaSchema = z.object({
  altText: z.string().max(255).optional().nullable(),
});

export const mediaListQuerySchema = z.object({
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().max(100).optional(),
  search: z.string().optional(),
  mimeType: z.string().optional(),
});

export type UpdateMediaDto = z.infer<typeof updateMediaSchema>;
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;

// ─── Response shapes ──────────────────────────────────────────────

export interface MediaFileResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: string;
  url: string;
  altText: string | null;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
}
