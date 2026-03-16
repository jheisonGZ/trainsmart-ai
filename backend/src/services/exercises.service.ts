import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import {
  getExerciseById,
  getExerciseMedia,
  listExercises,
} from '../repositories/exercises.repository';
import type { ExerciseQueryInput } from '../validators/exercises.schemas';

export async function listExerciseLibrary(
  supabase: RequestSupabaseClient,
  _auth: AuthUser,
  query: ExerciseQueryInput,
) {
  return listExercises(supabase, query);
}

export async function getExerciseDetail(
  supabase: RequestSupabaseClient,
  _auth: AuthUser,
  exerciseId: string,
) {
  return getExerciseById(supabase, exerciseId);
}

export async function getExerciseMediaList(
  supabase: RequestSupabaseClient,
  _auth: AuthUser,
  exerciseId: string,
) {
  return getExerciseMedia(supabase, exerciseId);
}
