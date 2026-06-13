import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response';
import { auditContextFromRequest, auditCreate, auditUpdate, auditDelete, auditPublish } from '../../utils/audit';
import * as svc from './campaigns.service';
import type {
  CreateCampaignDto, UpdateCampaignDto, CampaignListQuery,
  CreateSessionDto, UpdateSessionDto,
  CreateServiceDto, UpdateServiceDto,
  AssignDoctorDto, AssignVolunteerDto,
} from './campaigns.types';

// ─── Campaign CRUD ───────────────────────────────────────────────

export async function createCampaignHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as CreateCampaignDto;
    const campaign = await svc.createCampaign(dto, req.user!.sub);
    await auditCreate('campaign', campaign.id, { title: dto.title, campaignType: dto.campaignType }, auditContextFromRequest(req));
    sendCreated(res, campaign);
  } catch (err) { next(err); }
}

export async function listCampaignsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await svc.listCampaigns(req.query as never as CampaignListQuery);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (err) { next(err); }
}

export async function getCampaignHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await svc.getCampaign(req.params.id));
  } catch (err) { next(err); }
}

export async function updateCampaignHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as UpdateCampaignDto;
    const updated = await svc.updateCampaign(req.params.id, dto);
    await auditUpdate('campaign', req.params.id, {}, dto as Record<string, unknown>, auditContextFromRequest(req));
    sendSuccess(res, updated);
  } catch (err) { next(err); }
}

export async function deleteCampaignHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaign = await svc.getCampaign(req.params.id);
    await svc.deleteCampaign(req.params.id);
    await auditDelete('campaign', req.params.id, { title: campaign.title }, auditContextFromRequest(req));
    sendNoContent(res);
  } catch (err) { next(err); }
}

// ─── Lifecycle ───────────────────────────────────────────────────

export async function publishCampaignHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaign = await svc.publishCampaign(req.params.id);
    await auditPublish('campaign', req.params.id, auditContextFromRequest(req));
    sendSuccess(res, campaign);
  } catch (err) { next(err); }
}

export async function openRegistrationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaign = await svc.openRegistration(req.params.id);
    await auditUpdate('campaign', req.params.id, {}, { status: 'registration_open' }, auditContextFromRequest(req));
    sendSuccess(res, campaign);
  } catch (err) { next(err); }
}

export async function closeRegistrationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaign = await svc.closeRegistration(req.params.id);
    await auditUpdate('campaign', req.params.id, {}, { status: 'registration_closed' }, auditContextFromRequest(req));
    sendSuccess(res, campaign);
  } catch (err) { next(err); }
}

export async function completeCampaignHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaign = await svc.completeCampaign(req.params.id);
    await auditUpdate('campaign', req.params.id, {}, { status: 'completed' }, auditContextFromRequest(req));
    sendSuccess(res, campaign);
  } catch (err) { next(err); }
}

export async function cancelCampaignHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const campaign = await svc.cancelCampaign(req.params.id);
    await auditUpdate('campaign', req.params.id, {}, { status: 'cancelled' }, auditContextFromRequest(req));
    sendSuccess(res, campaign);
  } catch (err) { next(err); }
}

// ─── Sessions ────────────────────────────────────────────────────

export async function createSessionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const session = await svc.createSession(req.params.id, req.body as CreateSessionDto);
    await auditCreate('campaign_session', session.id, { campaignId: req.params.id, sessionDate: session.sessionDate }, auditContextFromRequest(req));
    sendCreated(res, session);
  } catch (err) { next(err); }
}

export async function listSessionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await svc.listSessions(req.params.id));
  } catch (err) { next(err); }
}

export async function updateSessionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await svc.updateSession(req.params.id, req.params.sessionId, req.body as UpdateSessionDto);
    sendSuccess(res, updated);
  } catch (err) { next(err); }
}

export async function deleteSessionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deleteSession(req.params.id, req.params.sessionId);
    sendNoContent(res);
  } catch (err) { next(err); }
}

// ─── Services ────────────────────────────────────────────────────

export async function createServiceHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const service = await svc.createService(req.params.id, req.body as CreateServiceDto);
    await auditCreate('campaign_service', service.id, { campaignId: req.params.id, name: service.name }, auditContextFromRequest(req));
    sendCreated(res, service);
  } catch (err) { next(err); }
}

export async function listServicesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await svc.listServices(req.params.id));
  } catch (err) { next(err); }
}

export async function updateServiceHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await svc.updateService(req.params.id, req.params.serviceId, req.body as UpdateServiceDto);
    sendSuccess(res, updated);
  } catch (err) { next(err); }
}

export async function deleteServiceHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deleteService(req.params.id, req.params.serviceId);
    sendNoContent(res);
  } catch (err) { next(err); }
}

// ─── Doctor Assignment ────────────────────────────────────────────

export async function assignDoctorHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const assignment = await svc.assignDoctor(req.params.id, req.body as AssignDoctorDto);
    sendCreated(res, assignment);
  } catch (err) { next(err); }
}

export async function listCampaignDoctorsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await svc.listCampaignDoctors(req.params.id));
  } catch (err) { next(err); }
}

export async function removeDoctorHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.removeDoctorAssignment(req.params.id, req.params.doctorId);
    sendNoContent(res);
  } catch (err) { next(err); }
}

// ─── Volunteer Assignment ─────────────────────────────────────────

export async function assignVolunteerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const assignment = await svc.assignVolunteer(req.params.id, req.body as AssignVolunteerDto);
    sendCreated(res, assignment);
  } catch (err) { next(err); }
}

export async function listCampaignVolunteersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await svc.listCampaignVolunteers(req.params.id));
  } catch (err) { next(err); }
}

export async function removeVolunteerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.removeVolunteerAssignment(req.params.id, req.params.userId);
    sendNoContent(res);
  } catch (err) { next(err); }
}
