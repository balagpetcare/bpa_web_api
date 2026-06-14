import { CampaignMediaRole } from '@prisma/client';
import { prisma } from '../../database/prisma';

const mediaInclude = {
  mediaFile: { select: { id: true, url: true, filename: true, mimeType: true, sizeBytes: true } },
} as const;

// ─── Queries ─────────────────────────────────────────────────────

export async function listCampaignMedia(campaignId: string) {
  return prisma.campaignMedia.findMany({
    where: { campaignId },
    orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
    include: mediaInclude,
  });
}

export async function getCampaignMediaById(id: string) {
  return prisma.campaignMedia.findUnique({ where: { id }, include: mediaInclude });
}

export async function getCampaignMediaByRole(campaignId: string, role: CampaignMediaRole) {
  return prisma.campaignMedia.findMany({
    where: { campaignId, role },
    orderBy: { sortOrder: 'asc' },
    include: mediaInclude,
  });
}

// ─── Mutations ───────────────────────────────────────────────────

export async function createCampaignMedia(
  campaignId: string,
  mediaFileId: string,
  role: CampaignMediaRole,
  altText?: string,
) {
  // For singleton roles, remove existing first
  if (role !== CampaignMediaRole.gallery) {
    await prisma.campaignMedia.deleteMany({ where: { campaignId, role } });
  }

  // Compute next sortOrder for gallery
  let sortOrder = 0;
  if (role === CampaignMediaRole.gallery) {
    const last = await prisma.campaignMedia.findFirst({
      where: { campaignId, role: CampaignMediaRole.gallery },
      orderBy: { sortOrder: 'desc' },
    });
    sortOrder = last ? last.sortOrder + 1 : 0;
  }

  return prisma.campaignMedia.create({
    data: { campaignId, mediaFileId, role, sortOrder, altText },
    include: mediaInclude,
  });
}

export async function updateCampaignMedia(id: string, data: { mediaFileId?: string; altText?: string | null; sortOrder?: number }) {
  return prisma.campaignMedia.update({ where: { id }, data, include: mediaInclude });
}

export async function deleteCampaignMedia(id: string) {
  return prisma.campaignMedia.delete({ where: { id } });
}

export async function reorderGallery(campaignId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.campaignMedia.update({
        where: { id, campaignId },
        data: { sortOrder: i },
      }),
    ),
  );
  return listCampaignMedia(campaignId);
}

// ─── Detail include (used by campaigns.repository) ───────────────

export const campaignMediaDetailInclude = {
  media: {
    orderBy: [{ role: 'asc' as const }, { sortOrder: 'asc' as const }],
    include: {
      mediaFile: { select: { id: true, url: true, mimeType: true, sizeBytes: true } },
    },
  },
} as const;
