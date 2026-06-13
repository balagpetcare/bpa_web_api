import { AppError } from '../../utils/AppError';
import { buildPaginationMeta, parsePaginationQuery } from '../../utils/response';
import { AuditContext, auditCreate, auditUpdate, auditDelete } from '../../utils/audit';
import { PaginationMeta } from '../../types';
import { uploadToStorage, deleteFromStorage } from '../../storage/storage.service';
import * as repo from './media.repository';
import { UpdateMediaDto, MediaListQuery, MediaFileResponse } from './media.types';

type RawFile = Awaited<ReturnType<typeof repo.findMediaById>>;

function format(f: NonNullable<RawFile>): MediaFileResponse {
  return {
    id: f.id,
    filename: f.filename,
    originalName: f.originalName,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes.toString(),
    url: f.url,
    altText: f.altText,
    uploadedById: f.uploadedById,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
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
  uploadedById: string,
  ctx: AuditContext,
): Promise<MediaFileResponse> {
  const { objectKey, url } = await uploadToStorage(file);

  const created = await repo.createMediaFile({
    filename: objectKey,
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    url,
    uploadedBy: { connect: { id: uploadedById } },
  });

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
