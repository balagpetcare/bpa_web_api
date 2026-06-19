import sharp from 'sharp';
import { prisma } from '../../database/prisma';
import { AppError } from '../../utils/AppError';
import { buildPaginationMeta, parsePaginationQuery } from '../../utils/response';
import { AuditContext, auditCreate, auditUpdate, auditDelete } from '../../utils/audit';
import { PaginationMeta } from '../../types';
import { uploadToStorage, deleteFromStorage, downloadFromStorage, uploadBufferToStorage, verifyFileExists } from '../../storage/storage.service';
import * as repo from './media.repository';
import { UpdateMediaDto, MediaListQuery, MediaFileResponse, CropMediaDto } from './media.types';

type RawFile = Awaited<ReturnType<typeof repo.findMediaById>>;

function format(f: NonNullable<RawFile>): MediaFileResponse {
  const isMissing = !verifyFileExists(f.filename);
  
  return {
    id: f.id,
    filename: f.filename,
    originalName: f.originalName,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes.toString(),
    url: isMissing ? 'https://placehold.co/400x400?text=File+Missing' : f.url,
    altText: f.altText,
    uploadedById: f.uploadedById,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    missing: isMissing,
  };
}

export async function cropMedia(
  id: string,
  dto: CropMediaDto,
  uploadedById: string | null | undefined,
  ctx: AuditContext,
): Promise<MediaFileResponse> {
  const existing = await repo.findMediaById(id);
  if (!existing) throw AppError.notFound('MediaFile');

  const buffer = await downloadFromStorage(existing.filename);

  const croppedBuffer = await sharp(buffer)
    .extract({
      left: Math.round(dto.x),
      top: Math.round(dto.y),
      width: Math.round(dto.width),
      height: Math.round(dto.height),
    })
    .resize(dto.targetWidth, dto.targetHeight)
    .toBuffer();

  const originalName = existing.originalName;
  const ext = originalName.split('.').pop();
  const newName = `${originalName.replace(`.${ext}`, '')}_cropped.${ext}`;

  const { objectKey, url } = await uploadBufferToStorage(croppedBuffer, newName, existing.mimeType);

  const data: Parameters<typeof repo.createMediaFile>[0] = {
    filename: objectKey,
    originalName: newName,
    mimeType: existing.mimeType,
    sizeBytes: croppedBuffer.length,
    url,
  };

  if (uploadedById) {
    const userExists = await prisma.user.findUnique({
      where: { id: uploadedById },
      select: { id: true },
    });
    if (!userExists) {
      throw AppError.unauthorized('Authenticated user not found in the database');
    }
    data.uploadedBy = { connect: { id: uploadedById } };
  }

  const created = await repo.createMediaFile(data);

  await auditCreate('media_file', created.id, { filename: created.filename, url, sourceId: id }, ctx);
  return format(created);
}

export async function listMedia(
  query: MediaListQuery,
): Promise<{ data: MediaFileResponse[]; meta: PaginationMeta }> {
  const { page, limit, skip } = parsePaginationQuery(query.page, query.limit);
  const filter = { search: query.search, mimeType: query.mimeType };
  const [rows, total] = await Promise.all([
    repo.findManyMedia(filter, skip, limit),
    repo.countMedia(filter),
  ]);
  return { data: rows.map(format), meta: buildPaginationMeta(total, page, limit) };
}

export async function getMediaById(id: string): Promise<MediaFileResponse> {
  const f = await repo.findMediaById(id);
  if (!f) throw AppError.notFound('MediaFile');
  return format(f);
}

export async function uploadFile(
  file: Express.Multer.File,
  uploadedById: string | null | undefined,
  ctx: AuditContext,
): Promise<MediaFileResponse> {
  const { objectKey, url } = await uploadToStorage(file);
  const data: Parameters<typeof repo.createMediaFile>[0] = {
    filename: objectKey,
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    url,
  };

  if (uploadedById) {
    const userExists = await prisma.user.findUnique({
      where: { id: uploadedById },
      select: { id: true },
    });
    if (!userExists) {
      throw AppError.unauthorized('Authenticated user not found in the database');
    }
    data.uploadedBy = { connect: { id: uploadedById } };
  }

  const created = await repo.createMediaFile(data);

  await auditCreate('media_file', created.id, { filename: created.filename, url }, ctx);
  return format(created);
}

export async function updateMedia(
  id: string,
  dto: UpdateMediaDto,
  ctx: AuditContext,
): Promise<MediaFileResponse> {
  const existing = await repo.findMediaById(id);
  if (!existing) throw AppError.notFound('MediaFile');
  const updated = await repo.updateMediaFile(id, { altText: dto.altText });
  await auditUpdate('media_file', id, { altText: existing.altText }, { altText: updated.altText }, ctx);
  return format(updated);
}

export async function deleteMedia(id: string, ctx: AuditContext): Promise<void> {
  const existing = await repo.findMediaById(id);
  if (!existing) throw AppError.notFound('MediaFile');

  await deleteFromStorage(existing.filename);

  await repo.deleteMediaFile(id);
  await auditDelete('media_file', id, { filename: existing.filename }, ctx);
}
