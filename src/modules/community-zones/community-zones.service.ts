import { AppError } from '../../utils/AppError';
import * as repo from './community-zones.repository';
import type { CreateCommunityZoneDto, UpdateCommunityZoneDto, CommunityZoneListQuery } from './community-zones.types';

export async function createZone(dto: CreateCommunityZoneDto) {
  return repo.createZone(dto);
}

export async function listZones(query: CommunityZoneListQuery) {
  return repo.listZones(query);
}

export async function listActiveZonesPublic() {
  return repo.listActiveZonesPublic();
}

export async function getZone(id: string) {
  const zone = await repo.getZoneById(id);
  if (!zone) throw AppError.notFound('Community zone');
  return zone;
}

export async function getZoneBySlug(slug: string) {
  const zone = await repo.getZoneBySlug(slug);
  if (!zone) throw AppError.notFound('Community zone');
  return zone;
}

export async function updateZone(id: string, dto: UpdateCommunityZoneDto) {
  await getZone(id);
  return repo.updateZone(id, dto);
}

export async function deleteZone(id: string) {
  await getZone(id);
  await repo.deleteZone(id);
}
