import { z } from 'zod';

export const ContentPostTypeSchema = z.enum([
  'VIDEO',
  'COMMUNITY_POST',
  'ANNOUNCEMENT',
  'DONATION_STORY',
  'CAMPAIGN_UPDATE',
  'PET_CARE_TIP',
]);

export const CreatePostSchema = z.object({
  type: ContentPostTypeSchema,
  titleEn: z.string().min(1, 'Title (English) is required').max(255),
  titleBn: z.string().min(1, 'Title (Bengali) is required').max(255),
  slug: z.string().min(1, 'Slug is required').max(255),
  summaryEn: z.string().optional().nullable(),
  summaryBn: z.string().optional().nullable(),
  bodyEn: z.string().optional().nullable(),
  bodyBn: z.string().optional().nullable(),
  coverImageUrl: z.string().url().or(z.string().length(0)).optional().nullable(),
  thumbnailUrl: z.string().url().or(z.string().length(0)).optional().nullable(),
  videoUrl: z.string().url().or(z.string().length(0)).optional().nullable(),
  videoProvider: z.string().max(50).optional().nullable(),
  videoSourceType: z.string().max(20).optional().nullable(),
  videoFileUrl: z.string().optional().nullable(),
  videoFileKey: z.string().optional().nullable(),
  videoPosterUrl: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  categoryId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).default([]),
  allowComments: z.boolean().default(true),
  showOnHomepage: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  homepagePriority: z.number().int().default(0),
  ctaLabelEn: z.string().max(100).optional().nullable(),
  ctaLabelBn: z.string().max(100).optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  ctaType: z.string().max(50).optional().nullable(),
  publishedAt: z.string().datetime().optional().nullable(),
});

export const UpdatePostSchema = CreatePostSchema.partial();

export const CreateCategorySchema = z.object({
  nameEn: z.string().min(1, 'Category name (English) is required').max(100),
  nameBn: z.string().min(1, 'Category name (Bengali) is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100),
  description: z.string().optional().nullable(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const CreateCommentSchema = z.object({
  body: z.string().min(1, 'Comment body is required'),
});

export const UpdateCommentSchema = CreateCommentSchema;

export const CreateReportSchema = z.object({
  reason: z.string().min(1, 'Reason for report is required'),
});

export const PostQuerySchema = z.object({
  type: ContentPostTypeSchema.optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  limit: z.coerce.number().int().positive().default(20),
  page: z.coerce.number().int().positive().default(1),
  q: z.string().optional(),
});
