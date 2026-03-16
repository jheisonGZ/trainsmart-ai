import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import type { Exercise, ExerciseMedia } from '../types/exercise.types';
import { NotFoundError } from '../utils/api-response';
import type { ExerciseQueryInput } from '../validators/exercises.schemas';

export async function listExercises(supabase: RequestSupabaseClient, query: ExerciseQueryInput) {
  let request = supabase.from('exercises').select('*');

  if (query.muscle) {
    request = request.eq('primary_muscle', query.muscle);
  }

  if (query.equipment) {
    request = request.eq('equipment', query.equipment);
  }

  if (query.difficulty) {
    request = request.eq('difficulty', query.difficulty);
  }

  if (query.search) {
    request = request.ilike('name', `%${query.search}%`);
  }

  const { data, error } = await request
    .order('name', { ascending: true })
    .range(query.offset, query.offset + query.limit - 1)
    .returns<Exercise[]>();

  throwIfSupabaseError(error, 'Failed to list exercises.');
  return data ?? [];
}

export async function getExerciseById(supabase: RequestSupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', id)
    .maybeSingle<Exercise>();

  throwIfSupabaseError(error, 'Failed to fetch exercise.');

  if (!data) {
    throw new NotFoundError('Exercise not found');
  }

  return data;
}

export async function getExerciseMedia(supabase: RequestSupabaseClient, exerciseId: string) {
  const { data, error } = await supabase
    .from('exercise_media')
    .select('*')
    .eq('exercise_id', exerciseId)
    .order('created_at', { ascending: true })
    .returns<ExerciseMedia[]>();

  throwIfSupabaseError(error, 'Failed to fetch exercise media.');
  return data ?? [];
}

export async function findExerciseIdsByNames(
  supabase: RequestSupabaseClient,
  names: string[],
) {
  if (names.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from('exercises')
    .select('id, name')
    .in('name', names)
    .returns<Array<{ id: string; name: string }>>();

  throwIfSupabaseError(error, 'Failed to resolve exercise ids by name.');
  return new Map((data ?? []).map((exercise) => [exercise.name, exercise.id]));
}
