import { z } from 'zod';
import { PetCensusStatus } from '@prisma/client';

export const PET_CENSUS_SOURCE = 'PET_CENSUS_2026';

const bdMobile = z.string().regex(/^(\+8801|01)[3-9]\d{8}$/, 'Invalid Bangladeshi mobile number');
const optionalString = (max: number) => z.string().trim().max(max).optional().or(z.literal('')).transform((v) => v || undefined);
const petTypeSchema = z.enum(['cat', 'dog', 'bird', 'other']);
const queryBoolean = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean());

const rawSubmitCensusSchema = z.object({
  ownerName: z.string().min(2).max(120),
  mobile: bdMobile.optional(),
  ownerMobile: bdMobile.optional(),
  ownerEmail: z.string().email().optional().or(z.literal('')).transform((v) => v || undefined),
  email: z.string().email().optional().or(z.literal('')).transform((v) => v || undefined),
  ownerAddress: optionalString(500),
  address: optionalString(500),
  zoneId: z.string().uuid().optional().or(z.literal('')).transform((v) => v || undefined),
  areaText: optionalString(255),
  area: optionalString(255),
  petType: petTypeSchema,
  petCount: z.coerce.number().int().min(1).max(999),
  breed: optionalString(120),
  petCountDog: z.coerce.number().int().min(0).max(999).optional(),
  petCountCat: z.coerce.number().int().min(0).max(999).optional(),
  petCountOther: z.coerce.number().int().min(0).max(999).optional(),
  petsJson: z.array(z.record(z.unknown())).optional(),
  vaccinationInterest: z.coerce.boolean().default(false),
  communityClinicInterest: z.coerce.boolean().default(false),
  communityPetShopInterest: z.coerce.boolean().default(false),
  carePartnerInterest: z.coerce.boolean().default(false),
  isVaccinationInterested: z.coerce.boolean().optional(),
  isClinicInterested: z.coerce.boolean().optional(),
  isPetShopInterested: z.coerce.boolean().optional(),
  isCarePartnerInterested: z.coerce.boolean().optional(),
  notes: optionalString(2000),
  consent: z.coerce.boolean().optional(),
  hasConsented: z.coerce.boolean().optional(),
  source: z.string().max(80).optional().default(PET_CENSUS_SOURCE),
  sourceRoute: z.string().max(80).optional(),
}).superRefine((data, ctx) => {
  if (!data.mobile && !data.ownerMobile) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mobile'], message: 'Mobile is required' });
  }
  if (data.consent !== true && data.hasConsented !== true) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['consent'], message: 'Consent is required' });
  }
});

export const submitCensusSchema = rawSubmitCensusSchema.transform((data) => {
  const petCountDog = data.petType === 'dog' ? data.petCount : (data.petCountDog ?? 0);
  const petCountCat = data.petType === 'cat' ? data.petCount : (data.petCountCat ?? 0);
  const petCountOther = data.petType === 'bird' || data.petType === 'other' ? data.petCount : (data.petCountOther ?? 0);

  return {
    ownerName: data.ownerName,
    ownerMobile: data.mobile ?? data.ownerMobile!,
    ownerEmail: data.email ?? data.ownerEmail,
    ownerAddress: data.address ?? data.ownerAddress,
    zoneId: data.zoneId,
    areaText: data.area ?? data.areaText,
    petType: data.petType,
    petCount: data.petCount,
    breed: data.breed,
    petCountDog,
    petCountCat,
    petCountOther,
    petsJson: data.petsJson,
    isVaccinationInterested: data.isVaccinationInterested ?? data.vaccinationInterest,
    isClinicInterested: data.isClinicInterested ?? data.communityClinicInterest,
    isPetShopInterested: data.isPetShopInterested ?? data.communityPetShopInterest,
    isCarePartnerInterested: data.isCarePartnerInterested ?? data.carePartnerInterest,
    hasConsented: true,
    notes: data.notes,
    source: data.source || PET_CENSUS_SOURCE,
    sourceRoute: data.sourceRoute,
  };
});

export const updateCensusSchema = z.object({
  status: z.nativeEnum(PetCensusStatus).optional(),
  adminNote: z.string().max(3000).optional().or(z.literal('')).transform((v) => v || null).optional(),
});

export const censusListQuerySchema = z.object({
  page: z.coerce.number().positive().optional(),
  limit: z.coerce.number().positive().max(100).optional(),
  status: z.nativeEnum(PetCensusStatus).optional(),
  zoneId: z.string().uuid().optional(),
  petType: petTypeSchema.optional(),
  area: z.string().optional(),
  vaccinationInterest: queryBoolean.optional(),
  communityClinicInterest: queryBoolean.optional(),
  communityPetShopInterest: queryBoolean.optional(),
  carePartnerInterest: queryBoolean.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
});

export type SubmitCensusDto = z.infer<typeof submitCensusSchema>;
export type UpdateCensusDto = z.infer<typeof updateCensusSchema>;
export type CensusListQuery = z.infer<typeof censusListQuerySchema>;
