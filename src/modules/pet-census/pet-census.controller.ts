import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response';
import { auditContextFromRequest, auditUpdate, auditDelete } from '../../utils/audit';
import * as svc from './pet-census.service';
import type { SubmitCensusDto, UpdateCensusDto, CensusListQuery } from './pet-census.types';

// ─── Admin ───────────────────────────────────────────────────────

export async function listSubmissionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await svc.listSubmissions(req.query as never as CensusListQuery);
    sendSuccess(res, result.items, 200, result.meta);
  } catch (err) { next(err); }
}

export async function exportSubmissionsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const csv = await svc.exportSubmissions(req.query as never as CensusListQuery);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pet-census-2026.csv"');
    res.status(200).send(csv);
  } catch (err) { next(err); }
}

export async function getSubmissionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    sendSuccess(res, await svc.getSubmission(req.params.id));
  } catch (err) { next(err); }
}

export async function updateSubmissionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as UpdateCensusDto;
    const updated = await svc.updateSubmission(req.params.id, dto);
    auditUpdate('pet_census', req.params.id, {}, dto as Record<string, unknown>, auditContextFromRequest(req));
    sendSuccess(res, updated);
  } catch (err) { next(err); }
}

export async function deleteSubmissionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.deleteSubmission(req.params.id);
    auditDelete('pet_census', req.params.id, {}, auditContextFromRequest(req));
    sendNoContent(res);
  } catch (err) { next(err); }
}

// ─── Public ──────────────────────────────────────────────────────

export async function submitCensusHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = req.body as SubmitCensusDto;
    const ipAddress = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await svc.submitCensus(dto, ipAddress, userAgent);
    sendCreated(res, {
      id: result.submission.id,
      duplicateHint: result.duplicateHint,
      message: 'Thank you. Your Pet Census 2026 information has been submitted for BPA planning.',
    });
  } catch (err) { next(err); }
}
