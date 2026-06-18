import { Request, Response, NextFunction } from 'express';
import { LocationType } from '@prisma/client';
import {
  listLocations,
  getLocationById,
  searchLocations,
  getLocationTree,
  createLocation,
  updateLocation,
  softDeleteLocation,
} from './location-tree.service';

// ── Public handlers ────────────────────────────────────────────────────────────

export async function listLocationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const type = req.query.type as LocationType | undefined;
    const parentId = req.query.parentId as string | undefined;
    const activeOnly = req.query.activeOnly !== 'false';

    // parentId=null (string) means explicitly top-level
    const parentFilter =
      parentId === 'null' ? null : parentId ?? undefined;

    const data = await listLocations({ type, parentId: parentFilter, activeOnly });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getLocationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const node = await getLocationById(id);
    if (!node) { res.status(404).json({ message: 'Location not found' }); return; }
    res.json(node);
  } catch (err) {
    next(err);
  }
}

export async function treeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rootId = req.query.rootId as string | undefined;
    const tree = await getLocationTree(rootId ?? null);
    res.json({ data: tree });
  } catch (err) {
    next(err);
  }
}

export async function searchHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const q = (req.query.q as string ?? '').trim();
    if (!q) { res.json({ data: [] }); return; }
    const type = req.query.type as LocationType | undefined;
    const limit = Math.min(parseInt(req.query.limit as string ?? '20', 10), 50);
    const data = await searchLocations({ q, type, limit });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

// ── Admin handlers ─────────────────────────────────────────────────────────────

export async function createLocationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const node = await createLocation(req.body);
    res.status(201).json(node);
  } catch (err) {
    next(err);
  }
}

export async function updateLocationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const node = await updateLocation(id, req.body);
    res.json(node);
  } catch (err) {
    next(err);
  }
}

export async function deleteLocationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    await softDeleteLocation(id);
    res.json({ message: 'Location deactivated' });
  } catch (err) {
    next(err);
  }
}

// Trigger import via API (admin only).
// The actual heavy import should be run as a CLI script:
//   npm run seed:locations
// This endpoint returns a 501 with instructions to avoid bundling seed scripts into the server.
export async function importTriggerHandler(
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  res.status(501).json({
    message: 'Location import must be run as a CLI command: npm run seed:locations',
  });
}
