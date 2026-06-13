import { AppError } from '../../utils/AppError';
import * as repo from './doctors.repository';
import type { CreateDoctorDto, UpdateDoctorDto, DoctorListQuery } from './doctors.types';

export async function createDoctor(dto: CreateDoctorDto) {
  return repo.createDoctor(dto);
}

export async function listDoctors(query: DoctorListQuery) {
  return repo.listDoctors(query);
}

export async function getDoctor(id: string) {
  const d = await repo.getDoctorById(id);
  if (!d) throw AppError.notFound('Doctor not found');
  return d;
}

export async function updateDoctor(id: string, dto: UpdateDoctorDto) {
  await getDoctor(id);
  return repo.updateDoctor(id, dto);
}

export async function deactivateDoctor(id: string) {
  await getDoctor(id);
  return repo.softDeleteDoctor(id);
}
