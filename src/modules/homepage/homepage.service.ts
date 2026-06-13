import {
  HeroSlideMediaType,
  HeroSlideStatus,
  HomepageCtaType,
  HomepageSectionSource,
  HomepageSectionType,
  HomepageStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../utils/AppError';
import {
  AuditContext,
  auditCreate,
  auditDelete,
  auditPublish,
  auditUpdate,
} from '../../utils/audit';
import * as newsRepo from '../news/news.repository';
import * as eventsRepo from '../events/events.repository';
import * as campaignsRepo from '../campaigns/campaigns.repository';
import * as committeeRepo from '../committee/committee.repository';
import * as repo from './homepage.repository';
import type {
  FooterWriteDto,
  HeroSlideListQuery,
  HeroSlideWriteDto,
  HomepageQuery,
  PartnerListQuery,
  PartnerWriteDto,
  ReorderSectionsDto,
  SectionItemWriteDto,
  SectionListQuery,
  SectionWriteDto,
  UpdateHeroSlideDto,
  UpdateHomepageDto,
  UpdatePartnerDto,
  UpdateSectionDto,
} from './homepage.types';

function nullableJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function normalizeLocale(locale?: string | null) {
  return locale?.trim() || 'en';
}

function ensureSchedule(startAt?: string | null, endAt?: string | null) {
  if (startAt && endAt && new Date(startAt) > new Date(endAt)) {
    throw AppError.badRequest('End date must be after start date', 'INVALID_SCHEDULE');
  }
}

function ensureCta(type: string | undefined, label?: string | null, href?: string | null, field = 'CTA') {
  if (!type || type === 'none') return;
  if (!label || !href) throw AppError.badRequest(`${field} label and href are required`, 'INVALID_CTA');
  if (type === 'internal' && !href.startsWith('/')) {
    throw AppError.badRequest(`${field} internal href must start with "/"`, 'INVALID_CTA');
  }
}

async function ensureMedia(id: string | null | undefined, expectedPrefix: string, label: string) {
  if (!id) return null;
  const media = await prisma.mediaFile.findUnique({ where: { id } });
  if (!media) throw AppError.notFound(label);
  if (!media.mimeType.startsWith(expectedPrefix)) {
    throw AppError.badRequest(`${label} must be a ${expectedPrefix.replace('/', '')} asset`, 'INVALID_MEDIA_TYPE');
  }
  return media;
}

function sectionData(dto: SectionWriteDto | UpdateSectionDto): Prisma.HomepageSectionUpdateInput {
  ensureSchedule(dto.startAt, dto.endAt);
  ensureCta(dto.ctaType, dto.ctaLabel, dto.ctaHref);
  return {
    ...(dto.type !== undefined ? { type: dto.type as HomepageSectionType } : {}),
    ...(dto.source !== undefined ? { source: dto.source as HomepageSectionSource } : {}),
    ...(dto.title !== undefined ? { title: dto.title } : {}),
    ...(dto.eyebrow !== undefined ? { eyebrow: dto.eyebrow } : {}),
    ...(dto.subtitle !== undefined ? { subtitle: dto.subtitle } : {}),
    ...(dto.body !== undefined ? { body: dto.body } : {}),
    ...(dto.ctaType !== undefined ? { ctaType: dto.ctaType as HomepageCtaType } : {}),
    ...(dto.ctaLabel !== undefined ? { ctaLabel: dto.ctaLabel } : {}),
    ...(dto.ctaHref !== undefined ? { ctaHref: dto.ctaHref } : {}),
    ...(dto.ctaTarget !== undefined ? { ctaTarget: dto.ctaTarget } : {}),
    ...(dto.itemLimit !== undefined ? { itemLimit: dto.itemLimit } : {}),
    ...(dto.content !== undefined ? { content: nullableJson(dto.content) } : {}),
    ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}),
    ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    ...(dto.startAt !== undefined ? { startAt: dto.startAt ? new Date(dto.startAt) : null } : {}),
    ...(dto.endAt !== undefined ? { endAt: dto.endAt ? new Date(dto.endAt) : null } : {}),
  };
}

function sectionItemData(dto: SectionItemWriteDto): Prisma.HomepageSectionItemCreateWithoutSectionInput {
  return {
    entityType: dto.entityType ?? null,
    entityId: dto.entityId ?? null,
    title: dto.title ?? null,
    subtitle: dto.subtitle ?? null,
    body: dto.body ?? null,
    href: dto.href ?? null,
    metadata: nullableJson(dto.metadata),
    isVisible: dto.isVisible,
    sortOrder: dto.sortOrder,
    ...(dto.mediaId ? { media: { connect: { id: dto.mediaId } } } : {}),
  };
}

// isCreate=true omits disconnect — Prisma create does not accept disconnect on relations
function heroData(dto: HeroSlideWriteDto | UpdateHeroSlideDto, isCreate = false): Prisma.HeroSlideUpdateInput {
  ensureSchedule(dto.startAt, dto.endAt);
  ensureCta(dto.ctaType, dto.ctaLabel, dto.ctaHref);
  ensureCta(dto.secondaryCtaType, dto.secondaryCtaLabel, dto.secondaryCtaHref, 'Secondary CTA');
  if (dto.mediaType === 'video' && dto.videoId === null) {
    throw AppError.badRequest('Video slides require a video asset', 'INVALID_MEDIA');
  }
  return {
    ...(dto.locale !== undefined ? { locale: normalizeLocale(dto.locale) } : {}),
    ...(dto.title !== undefined ? { title: dto.title } : {}),
    ...(dto.badgeText !== undefined ? { badgeText: dto.badgeText } : {}),
    ...(dto.eyebrow !== undefined ? { eyebrow: dto.eyebrow } : {}),
    ...(dto.headline !== undefined ? { headline: dto.headline } : {}),
    ...(dto.body !== undefined ? { body: dto.body } : {}),
    ...(dto.campaignTag !== undefined ? { campaignTag: dto.campaignTag } : {}),
    ...(dto.status !== undefined ? { status: dto.status as HeroSlideStatus } : {}),
    ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    ...(dto.mediaType !== undefined ? { mediaType: dto.mediaType as HeroSlideMediaType } : {}),
    ...(dto.overlayPosition !== undefined ? { overlayPosition: dto.overlayPosition } : {}),
    ...(dto.ctaType !== undefined ? { ctaType: dto.ctaType as HomepageCtaType } : {}),
    ...(dto.ctaLabel !== undefined ? { ctaLabel: dto.ctaLabel } : {}),
    ...(dto.ctaHref !== undefined ? { ctaHref: dto.ctaHref } : {}),
    ...(dto.ctaTarget !== undefined ? { ctaTarget: dto.ctaTarget } : {}),
    ...(dto.secondaryCtaType !== undefined ? { secondaryCtaType: dto.secondaryCtaType as HomepageCtaType } : {}),
    ...(dto.secondaryCtaLabel !== undefined ? { secondaryCtaLabel: dto.secondaryCtaLabel } : {}),
    ...(dto.secondaryCtaHref !== undefined ? { secondaryCtaHref: dto.secondaryCtaHref } : {}),
    ...(dto.secondaryCtaTarget !== undefined ? { secondaryCtaTarget: dto.secondaryCtaTarget } : {}),
    // desktopImageId is required on create so always connect when present
    ...(dto.desktopImageId !== undefined ? { desktopImage: { connect: { id: dto.desktopImageId } } } : {}),
    // optional image: skip entirely on create when null (no disconnect); disconnect only on update
    ...(dto.mobileImageId !== undefined
      ? dto.mobileImageId
        ? { mobileImage: { connect: { id: dto.mobileImageId } } }
        : isCreate ? {} : { mobileImage: { disconnect: true } }
      : {}),
    // optional video: same rule — omit on create when null
    ...(dto.videoId !== undefined
      ? dto.videoId
        ? { video: { connect: { id: dto.videoId } } }
        : isCreate ? {} : { video: { disconnect: true } }
      : {}),
    ...(dto.stats !== undefined ? { stats: nullableJson(dto.stats) } : {}),
    ...(dto.countdownLabel !== undefined ? { countdownLabel: dto.countdownLabel } : {}),
    ...(dto.countdownTargetAt !== undefined ? { countdownTargetAt: dto.countdownTargetAt ? new Date(dto.countdownTargetAt) : null } : {}),
    ...(dto.startAt !== undefined ? { startAt: dto.startAt ? new Date(dto.startAt) : null } : {}),
    ...(dto.endAt !== undefined ? { endAt: dto.endAt ? new Date(dto.endAt) : null } : {}),
    ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
  };
}

function partnerData(dto: PartnerWriteDto | UpdatePartnerDto): Prisma.PartnerUpdateInput {
  ensureSchedule(dto.startAt, dto.endAt);
  return {
    ...(dto.name !== undefined ? { name: dto.name } : {}),
    ...(dto.description !== undefined ? { description: dto.description } : {}),
    ...(dto.logoId !== undefined ? { logo: dto.logoId ? { connect: { id: dto.logoId } } : { disconnect: true } } : {}),
    ...(dto.url !== undefined ? { url: dto.url } : {}),
    ...(dto.tier !== undefined ? { tier: dto.tier } : {}),
    ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    ...(dto.startAt !== undefined ? { startAt: dto.startAt ? new Date(dto.startAt) : null } : {}),
    ...(dto.endAt !== undefined ? { endAt: dto.endAt ? new Date(dto.endAt) : null } : {}),
  };
}

export async function getAdminHomepage(query: HomepageQuery) {
  const locale = normalizeLocale(query.locale);
  await repo.ensureHomepage(locale);
  return repo.getHomepage(locale);
}

export async function updateAdminHomepage(dto: UpdateHomepageDto, ctx: AuditContext) {
  const locale = normalizeLocale(dto.locale);
  const homepage = await repo.updateHomepage(locale, {
    ...(dto.title !== undefined ? { title: dto.title } : {}),
    ...(dto.description !== undefined ? { description: dto.description } : {}),
    ...(dto.settings !== undefined ? { settings: nullableJson(dto.settings) } : {}),
    ...(ctx.actorId ? { updatedBy: { connect: { id: ctx.actorId } } } : {}),
  });
  await auditUpdate('homepage', homepage.id, {}, { locale }, ctx);
  return homepage;
}

export async function publishHomepage(query: HomepageQuery, ctx: AuditContext) {
  const locale = normalizeLocale(query.locale);
  const homepage = await repo.updateHomepage(locale, {
    status: HomepageStatus.published,
    publishedAt: new Date(),
    ...(ctx.actorId ? { updatedBy: { connect: { id: ctx.actorId } } } : {}),
  });
  await auditPublish('homepage', homepage.id, ctx);
  return homepage;
}

export async function listSections(query: SectionListQuery) {
  return repo.listSections(query);
}

export async function createSection(dto: SectionWriteDto, ctx: AuditContext) {
  const locale = normalizeLocale(dto.locale);
  const homepage = await repo.ensureHomepage(locale);
  const created = await repo.createSection({
    homepage: { connect: { id: homepage.id } },
    ...(sectionData(dto) as Prisma.HomepageSectionCreateWithoutHomepageInput),
  });
  await auditCreate('homepage_section', created.id, { type: created.type, locale }, ctx);
  return created;
}

export async function updateSection(id: string, dto: UpdateSectionDto, ctx: AuditContext) {
  const existing = await repo.getSectionById(id);
  if (!existing) throw AppError.notFound('HomepageSection');
  const updated = await repo.updateSection(id, sectionData(dto));
  await auditUpdate('homepage_section', id, { type: existing.type }, { type: updated.type }, ctx);
  return updated;
}

export async function deleteSection(id: string, ctx: AuditContext) {
  const existing = await repo.getSectionById(id);
  if (!existing) throw AppError.notFound('HomepageSection');
  await repo.deleteSection(id);
  await auditDelete('homepage_section', id, { type: existing.type }, ctx);
}

export async function reorderSections(dto: ReorderSectionsDto, ctx: AuditContext) {
  await repo.reorderSections(dto.items);
  await auditUpdate('homepage_section', 'bulk', {}, { count: dto.items.length }, ctx);
  return listSections({ locale: dto.locale });
}

export async function createSectionItem(sectionId: string, dto: SectionItemWriteDto, ctx: AuditContext) {
  const section = await repo.getSectionById(sectionId);
  if (!section) throw AppError.notFound('HomepageSection');
  if (dto.mediaId) await ensureMedia(dto.mediaId, 'image/', 'Section media');
  const created = await repo.createSectionItem(sectionId, sectionItemData(dto));
  await auditCreate('homepage_section_item', created.id, { sectionId }, ctx);
  return created;
}

export async function updateSectionItem(id: string, dto: SectionItemWriteDto, ctx: AuditContext) {
  if (dto.mediaId) await ensureMedia(dto.mediaId, 'image/', 'Section media');
  const updated = await repo.updateSectionItem(id, sectionItemData(dto) as Prisma.HomepageSectionItemUpdateInput);
  await auditUpdate('homepage_section_item', id, {}, { title: updated.title }, ctx);
  return updated;
}

export async function deleteSectionItem(id: string, ctx: AuditContext) {
  await repo.deleteSectionItem(id);
  await auditDelete('homepage_section_item', id, {}, ctx);
}

function withIsScheduledNow<T extends { startAt: Date | null; endAt: Date | null }>(slide: T) {
  const now = new Date();
  return {
    ...slide,
    isScheduledNow: (!slide.startAt || slide.startAt <= now) && (!slide.endAt || slide.endAt >= now),
  };
}

export async function listHeroSlides(query: HeroSlideListQuery) {
  const { items, meta } = await repo.listHeroSlides(query);
  return { items: items.map(withIsScheduledNow), meta };
}

export async function createHeroSlide(dto: HeroSlideWriteDto, ctx: AuditContext) {
  await ensureMedia(dto.desktopImageId, 'image/', 'Desktop image');
  if (dto.mobileImageId) await ensureMedia(dto.mobileImageId, 'image/', 'Mobile image');
  if (dto.videoId) await ensureMedia(dto.videoId, 'video/', 'Hero video');
  const created = await repo.createHeroSlide(heroData(dto, true) as Prisma.HeroSlideCreateInput);
  await auditCreate('hero_slide', created.id, { title: created.title }, ctx);
  return withIsScheduledNow(created);
}

export async function updateHeroSlide(id: string, dto: UpdateHeroSlideDto, ctx: AuditContext) {
  const existing = await repo.getHeroSlideById(id);
  if (!existing) throw AppError.notFound('HeroSlide');
  if (dto.desktopImageId) await ensureMedia(dto.desktopImageId, 'image/', 'Desktop image');
  if (dto.mobileImageId) await ensureMedia(dto.mobileImageId, 'image/', 'Mobile image');
  if (dto.videoId) await ensureMedia(dto.videoId, 'video/', 'Hero video');
  const updated = await repo.updateHeroSlide(id, heroData(dto));
  await auditUpdate('hero_slide', id, { title: existing.title }, { title: updated.title }, ctx);
  return withIsScheduledNow(updated);
}

export async function deleteHeroSlide(id: string, ctx: AuditContext) {
  const existing = await repo.getHeroSlideById(id);
  if (!existing) throw AppError.notFound('HeroSlide');
  await repo.deleteHeroSlide(id);
  await auditDelete('hero_slide', id, { title: existing.title }, ctx);
}

export async function listPartners(query: PartnerListQuery) {
  return repo.listPartners(query);
}

export async function createPartner(dto: PartnerWriteDto, ctx: AuditContext) {
  if (dto.logoId) await ensureMedia(dto.logoId, 'image/', 'Partner logo');
  const created = await repo.createPartner(partnerData(dto) as Prisma.PartnerCreateInput);
  await auditCreate('partner', created.id, { name: created.name }, ctx);
  return created;
}

export async function updatePartner(id: string, dto: UpdatePartnerDto, ctx: AuditContext) {
  const existing = await repo.getPartnerById(id);
  if (!existing) throw AppError.notFound('Partner');
  if (dto.logoId) await ensureMedia(dto.logoId, 'image/', 'Partner logo');
  const updated = await repo.updatePartner(id, partnerData(dto));
  await auditUpdate('partner', id, { name: existing.name }, { name: updated.name }, ctx);
  return updated;
}

export async function deletePartner(id: string, ctx: AuditContext) {
  const existing = await repo.getPartnerById(id);
  if (!existing) throw AppError.notFound('Partner');
  await repo.deletePartner(id);
  await auditDelete('partner', id, { name: existing.name }, ctx);
}

export async function getFooter(query: HomepageQuery) {
  return repo.getFooter(normalizeLocale(query.locale));
}

export async function upsertFooter(dto: FooterWriteDto, ctx: AuditContext) {
  const locale = normalizeLocale(dto.locale);
  if (dto.logoId) await ensureMedia(dto.logoId, 'image/', 'Footer logo');
  const footer = await repo.upsertFooter(
    locale,
    {
      locale,
      brandName: dto.brandName ?? null,
      brandText: dto.brandText ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      copyrightText: dto.copyrightText ?? null,
      socialLinks: nullableJson(dto.socialLinks),
      isActive: dto.isActive,
      ...(dto.logoId ? { logo: { connect: { id: dto.logoId } } } : {}),
    },
    {
      brandName: dto.brandName ?? null,
      brandText: dto.brandText ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      address: dto.address ?? null,
      copyrightText: dto.copyrightText ?? null,
      socialLinks: nullableJson(dto.socialLinks),
      isActive: dto.isActive,
      ...(dto.logoId !== undefined ? { logo: dto.logoId ? { connect: { id: dto.logoId } } : { disconnect: true } } : {}),
    },
  );
  const updated = await repo.replaceFooterGroups(footer.id, dto.groups);
  await auditUpdate('footer', footer.id, {}, { locale }, ctx);
  return updated;
}

async function getDynamicItems(section: { type: HomepageSectionType; itemLimit: number }) {
  const limit = section.itemLimit || 3;
  switch (section.type) {
    case 'news':
      return newsRepo.findManyNews({ status: 'published' }, 0, limit);
    case 'events':
      return eventsRepo.findManyEvents({ status: 'published', upcoming: true }, 0, limit);
    case 'campaigns': {
      const result = await campaignsRepo.listFeaturedCampaigns();
      return result;
    }
    case 'committee':
      return committeeRepo.findAllMembers(true).then((items) => items.slice(0, limit));
    default:
      return null;
  }
}

function isVisibleNow(section: { isVisible: boolean; startAt: Date | null; endAt: Date | null }, now = new Date()) {
  return section.isVisible && (!section.startAt || section.startAt <= now) && (!section.endAt || section.endAt >= now);
}

export async function getPublicHomepage(query: HomepageQuery) {
  const locale = normalizeLocale(query.locale);
  const [homepage, heroSlides, partners, footer] = await Promise.all([
    repo.getHomepage(locale),
    repo.listPublicHeroSlides(locale),
    repo.listPublicPartners(),
    repo.getFooter(locale),
  ]);

  const sections = homepage?.sections.filter((section) => isVisibleNow(section)) ?? [];
  const enrichedSections = await Promise.all(
    sections.map(async (section) => ({
      ...section,
      dynamicItems: await getDynamicItems(section),
    })),
  );

  return {
    homepage: homepage
      ? {
          id: homepage.id,
          locale: homepage.locale,
          title: homepage.title,
          description: homepage.description,
          status: homepage.status,
          settings: homepage.settings,
          publishedAt: homepage.publishedAt,
          updatedAt: homepage.updatedAt,
        }
      : null,
    sections: enrichedSections,
    heroSlides,
    partners,
    footer: footer
      ? {
          ...footer,
          groups: footer.groups.filter((group) => group.isVisible).map((group) => ({
            ...group,
            links: group.links.filter((link) => link.isVisible),
          })),
        }
      : null,
  };
}
