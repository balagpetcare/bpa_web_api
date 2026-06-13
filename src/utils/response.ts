import { Response } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { ApiSuccessResponse, PaginationMeta } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  status: number = HTTP_STATUS.OK,
  meta?: PaginationMeta,
): Response {
  const body: ApiSuccessResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function sendCreated<T>(res: Response, data: T): Response {
  return sendSuccess(res, data, HTTP_STATUS.CREATED);
}

export function sendNoContent(res: Response): Response {
  return res.status(HTTP_STATUS.NO_CONTENT).send();
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function parsePaginationQuery(
  rawPage: unknown,
  rawLimit: unknown,
  defaultLimit = 20,
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Number(rawPage) || 1);
  const limit = Math.min(100, Math.max(1, Number(rawLimit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}
