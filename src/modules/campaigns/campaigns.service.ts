import { CampaignStatus } from '@prisma/client';
import { AppError } from '../../utils/AppError';
import { generateSlug } from '../../utils/slug';
import { prisma } from '../../database/prisma';
import * as repo from './campaigns.repository';
import * as locationRepo from '../locations/locations.repository';
import type {
  CreateCampaignDto, UpdateCampaignDto, CampaignListQuery,
  CreateSessionDto, UpdateSessionDto,
  CreateServiceDto, UpdateServiceDto,
  AssignDoctorDto, AssignVolunteerDto,
} from './campaigns.types';

// ─── Slug ────────────────────────────────────────────────────────

async function uniqueCampaignSlug(title: string, excludeId?: string): Promise<string> {
  const base = generateSlug(title);
  let candidate = base;
  let counter = 2;
  while (true) {
    const existing = await prisma.campaign.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (!existing) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

// ─── Campaign ────────────────────────────────────────────────────

export async function createCampaign(dto: CreateCampaignDto, createdById: string) {
  const slug = await uniqueCampaignSlug(dto.title);
  return repo.createCampaign(dto, slug, createdById);
}

export async function listCampaigns(query: CampaignListQuery) {
  return repo.listCampaigns(query);
}

export async function getCampaign(id: string) {
  const c = await repo.getCampaignById(id);
  if (!c) throw AppError.notFound('Campaign not found');
  return c;
}

export async function updateCampaign(id: string, dto: UpdateCampaignDto) {
  const campaign = await getCampaign(id);
  if (campaign.status !== CampaignStatus.draft) {
    throw AppError.badRequest('Only draft campaigns can be edited. Use lifecycle endpoints to change status.');
  }
  return repo.updateCampaign(id, dto);
}

export async function publishCampaign(id: string) {
  const campaign = await getCampaign(id);
  if (campaign.status !== CampaignStatus.draft) throw AppError.badRequest('Campaign must be in draft to publish');
  return repo.updateCampaignStatus(id, CampaignStatus.published);
}

export async function openRegistration(id: string) {
  const campaign = await getCampaign(id);
  if (campaign.status !== CampaignStatus.published) throw AppError.badRequest('Campaign must be published first');
  return repo.updateCampaignStatus(id, CampaignStatus.registration_open);
}

export async function closeRegistration(id: string) {
  const campaign = await getCampaign(id);
  if (campaign.status !== CampaignStatus.registration_open) throw AppError.badRequest('Registration is not open');
  return repo.updateCampaignStatus(id, CampaignStatus.registration_closed);
}

export async function completeCampaign(id: string) {
  const campaign = await getCampaign(id);
  const completableStatuses: string[] = [CampaignStatus.registration_open, CampaignStatus.registration_closed];
  if (!completableStatuses.includes(campaign.status)) {
    throw AppError.badRequest('Campaign cannot be completed from its current status');
  }
  return repo.updateCampaignStatus(id, CampaignStatus.completed);
}

export async function cancelCampaign(id: string) {
  const campaign = await getCampaign(id);
  const terminalStatuses: string[] = [CampaignStatus.completed, CampaignStatus.cancelled];
  if (terminalStatuses.includes(campaign.status)) {
    throw AppError.badRequest('Campaign is already completed or cancelled');
  }
  return repo.updateCampaignStatus(id, CampaignStatus.cancelled);
}

export async function deleteCampaign(id: string) {
  const campaign = await getCampaign(id);
  if (campaign.status !== CampaignStatus.draft) throw AppError.badRequest('Only draft campaigns can be deleted');
  return repo.deleteCampaign(id);
}

// ─── Sessions ────────────────────────────────────────────────────

async function validateVenueForSession(venueId: string): Promise<void> {
  const venue = await locationRepo.getVenueById(venueId);
  if (!venue) throw AppError.notFound('Venue not found');
  if (!venue.isActive) throw AppError.badRequest(`Venue "${venue.name}" is inactive and cannot be assigned to a session`);
}

export async function createSession(campaignId: string, dto: CreateSessionDto) {
  await getCampaign(campaignId);
  await validateVenueForSession(dto.venueId);
  return repo.createSession(campaignId, dto);
}

export async function listSessions(campaignId: string) {
  await getCampaign(campaignId);
  return repo.listSessions(campaignId);
}

export async function getSession(sessionId: string) {
  const s = await repo.getSessionById(sessionId);
  if (!s) throw AppError.notFound('Session not found');
  return s;
}

export async function updateSession(campaignId: string, sessionId: string, dto: UpdateSessionDto) {
  await getCampaign(campaignId);
  const session = await getSession(sessionId);
  if (session.campaignId !== campaignId) throw AppError.notFound('Session not found in this campaign');
  if (dto.venueId) await validateVenueForSession(dto.venueId);
  return repo.updateSession(sessionId, dto);
}

export async function deleteSession(campaignId: string, sessionId: string) {
  await getCampaign(campaignId);
  const session = await getSession(sessionId);
  if (session.campaignId !== campaignId) throw AppError.notFound('Session not found in this campaign');
  const registrationCount = await prisma.campaignRegistration.count({ where: { sessionId } });
  if (registrationCount > 0) {
    throw AppError.conflict(`Cannot delete session: ${registrationCount} registration(s) exist for this session`);
  }
  return repo.deleteSession(sessionId);
}

// ─── Services ────────────────────────────────────────────────────

export async function createService(campaignId: string, dto: CreateServiceDto) {
  await getCampaign(campaignId);
  return repo.createService(campaignId, dto);
}

export async function listServices(campaignId: string) {
  return repo.listServices(campaignId);
}

export async function updateService(campaignId: string, serviceId: string, dto: UpdateServiceDto) {
  await getCampaign(campaignId);
  const service = await repo.getServiceById(serviceId);
  if (!service || service.campaignId !== campaignId) throw AppError.notFound('Service not found in this campaign');
  return repo.updateService(serviceId, dto);
}

export async function deleteService(campaignId: string, serviceId: string) {
  await getCampaign(campaignId);
  const service = await repo.getServiceById(serviceId);
  if (!service || service.campaignId !== campaignId) throw AppError.notFound('Service not found in this campaign');
  return repo.deleteService(serviceId);
}

// ─── Doctor Assignment ────────────────────────────────────────────

export async function assignDoctor(campaignId: string, dto: AssignDoctorDto) {
  await getCampaign(campaignId);
  return repo.assignDoctor(campaignId, dto);
}

export async function listCampaignDoctors(campaignId: string) {
  await getCampaign(campaignId);
  return repo.listCampaignDoctors(campaignId);
}

export async function removeDoctorAssignment(campaignId: string, doctorId: string) {
  await getCampaign(campaignId);
  return repo.removeDoctorAssignment(campaignId, doctorId);
}

// ─── Volunteer Assignment ─────────────────────────────────────────

export async function assignVolunteer(campaignId: string, dto: AssignVolunteerDto) {
  await getCampaign(campaignId);
  return repo.assignVolunteer(campaignId, dto);
}

export async function listCampaignVolunteers(campaignId: string) {
  await getCampaign(campaignId);
  return repo.listCampaignVolunteers(campaignId);
}

export async function removeVolunteerAssignment(campaignId: string, userId: string) {
  await getCampaign(campaignId);
  return repo.removeVolunteerAssignment(campaignId, userId);
}
