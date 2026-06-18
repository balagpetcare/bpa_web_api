import { z } from 'zod';

export const createImpactStorySchema = z.object({
  titleEn: z.string().min(1, 'Title (English) is required').max(255),
  titleBn: z.string().max(255).optional(),
  slug: z.string().min(1, 'Slug is required').max(280),
  storyType: z.enum(['RESCUE', 'VACCINATION', 'FOOD', 'TREATMENT', 'ADOPTION', 'AWARENESS']).default('RESCUE'),
  location: z.string().max(255).optional(),
  animalType: z.string().max(100).optional(),
  animalName: z.string().max(255).optional(),
  shortDescriptionEn: z.string().optional(),
  shortDescriptionBn: z.string().optional(),
  fullStoryEn: z.string().min(1, 'Full story (English) is required'),
  fullStoryBn: z.string().optional(),
  beforeImageUrl: z.string().url('Invalid before image URL').optional().or(z.literal('')),
  afterImageUrl: z.string().url('Invalid after image URL').optional().or(z.literal('')),
  costUsed: z.number().positive().optional().nullable(),
  storyDate: z.string().optional(),
  status: z.string().default('DRAFT'),
  showOnDonationPage: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  isFeatured: z.boolean().default(false),
  purposeId: z.string().uuid().optional().nullable(),
  campaignId: z.string().uuid().optional().nullable(),
});

export const updateImpactStorySchema = createImpactStorySchema.partial();
