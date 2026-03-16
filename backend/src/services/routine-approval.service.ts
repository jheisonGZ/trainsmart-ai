import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import {
  archiveOtherRoutines,
  getRoutineVersionById,
  setRoutineStatus,
  updateRoutineVersionStatus,
} from '../repositories/routines.repository';
import { PreconditionFailedError } from '../utils/api-response';

export async function approveRoutineVersion(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  versionId: string,
) {
  const version = await getRoutineVersionById(supabase, versionId, auth.userId);

  if (version.approval_status === 'discarded') {
    throw new PreconditionFailedError('Discarded versions cannot be approved.');
  }

  await archiveOtherRoutines(supabase, auth.userId, version.routine.id);
  await setRoutineStatus(supabase, version.routine.id, 'active');

  return updateRoutineVersionStatus(supabase, versionId, 'approved');
}

export async function discardRoutineVersion(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  versionId: string,
) {
  const version = await getRoutineVersionById(supabase, versionId, auth.userId);

  if (version.approval_status === 'approved') {
    throw new PreconditionFailedError('Approved versions cannot be discarded.');
  }

  return updateRoutineVersionStatus(supabase, versionId, 'discarded');
}
