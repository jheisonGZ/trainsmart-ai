import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import type { PersonalRecord, PersonalRecordType } from '../types/personal-record.types';

export async function getPersonalRecordsByUser(supabase: RequestSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false })
    .returns<PersonalRecord[]>();

  throwIfSupabaseError(error, 'Failed to list personal records.');
  return data ?? [];
}

export async function getPersonalRecordsForExercise(
  supabase: RequestSupabaseClient,
  userId: string,
  exerciseName: string,
) {
  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .returns<PersonalRecord[]>();

  throwIfSupabaseError(error, 'Failed to fetch personal records for exercise.');
  return data ?? [];
}

interface UpsertPersonalRecordInput {
  userId: string;
  exerciseName: string;
  recordType: PersonalRecordType;
  value: number;
  previousValue: number | null;
  sessionId: string | null;
}

export async function upsertPersonalRecord(
  supabase: RequestSupabaseClient,
  input: UpsertPersonalRecordInput,
) {
  const { data, error } = await supabase
    .from('personal_records')
    .upsert(
      {
        user_id: input.userId,
        exercise_name: input.exerciseName,
        record_type: input.recordType,
        value: input.value,
        previous_value: input.previousValue,
        session_id: input.sessionId,
        achieved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,exercise_name,record_type' },
    )
    .select('*')
    .single<PersonalRecord>();

  throwIfSupabaseError(error, 'Failed to save personal record.');
  return data;
}
