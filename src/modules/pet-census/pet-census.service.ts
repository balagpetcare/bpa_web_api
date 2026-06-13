import { AppError } from '../../utils/AppError';
import * as repo from './pet-census.repository';
import type { SubmitCensusDto, UpdateCensusDto, CensusListQuery } from './pet-census.types';

export async function submitCensus(dto: SubmitCensusDto, ipAddress?: string, userAgent?: string) {
  const duplicate = await repo.findRecentSimilarSubmission(dto);
  const submission = await repo.createSubmission(dto, ipAddress, userAgent);
  return {
    submission,
    duplicateHint: duplicate
      ? {
          possibleDuplicate: true,
          existingSubmissionId: duplicate.id,
          submittedAt: duplicate.submittedAt,
          status: duplicate.status,
        }
      : { possibleDuplicate: false },
  };
}

export async function listSubmissions(query: CensusListQuery) {
  return repo.listSubmissions(query);
}

export async function getSubmission(id: string) {
  const s = await repo.getSubmissionById(id);
  if (!s) throw AppError.notFound('Census submission');
  return s;
}

export async function updateSubmission(id: string, dto: UpdateCensusDto) {
  await getSubmission(id);
  return repo.updateSubmission(id, dto);
}

export async function deleteSubmission(id: string) {
  await getSubmission(id);
  await repo.deleteSubmission(id);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw = value instanceof Date ? value.toISOString() : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export async function exportSubmissions(query: CensusListQuery) {
  const items = await repo.listSubmissionsForExport(query);
  const headers = [
    'id', 'ownerName', 'ownerMobile', 'ownerEmail', 'zone', 'area', 'address',
    'petType', 'petCount', 'breed', 'vaccinationInterest', 'clinicInterest',
    'petShopInterest', 'carePartnerInterest', 'status', 'source', 'notes',
    'adminNote', 'submittedAt',
  ];
  const rows = items.map((s) => [
    s.id,
    s.ownerName,
    s.ownerMobile,
    s.ownerEmail,
    s.zone?.name,
    s.areaText,
    s.ownerAddress,
    s.petType,
    s.petCount,
    s.breed,
    s.isVaccinationInterested,
    s.isClinicInterested,
    s.isPetShopInterested,
    s.isCarePartnerInterested,
    s.status,
    s.source,
    s.notes,
    s.adminNote,
    s.submittedAt,
  ].map(csvCell).join(','));
  return [headers.join(','), ...rows].join('\n');
}
