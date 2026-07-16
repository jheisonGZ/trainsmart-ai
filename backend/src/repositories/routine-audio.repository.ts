import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import type { RoutineAudioNarration } from '../types/routine-audio.types';

interface CreateRoutineAudioNarrationInput {
  userId: string;
  routineId: string;
  routineVersionId: string | null;
  workoutSessionId: string;
  dayIndex: number | null;
  voiceId: string;
  modelId: string;
  narrationText: string;
  audioStoragePath: string;
  outputFormat: string;
  characterCount: number;
}

export async function getAvailableRoutineAudioBySession(
  supabase: RequestSupabaseClient,
  userId: string,
  workoutSessionId: string,
) {
  const { data, error } = await supabase
    .from('routine_audio_narrations')
    .select('*')
    .eq('user_id', userId)
    .eq('workout_session_id', workoutSessionId)
    .eq('status', 'available')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<RoutineAudioNarration>();

  throwIfSupabaseError(error, 'Failed to fetch routine audio narration.');
  return data ?? null;
}

export async function createRoutineAudioNarration(
  supabase: RequestSupabaseClient,
  input: CreateRoutineAudioNarrationInput,
) {
  const { data, error } = await supabase
    .from('routine_audio_narrations')
    .insert({
      user_id: input.userId,
      routine_id: input.routineId,
      routine_version_id: input.routineVersionId,
      workout_session_id: input.workoutSessionId,
      day_index: input.dayIndex,
      provider: 'elevenlabs',
      voice_id: input.voiceId,
      model_id: input.modelId,
      narration_text: input.narrationText,
      audio_storage_path: input.audioStoragePath,
      output_format: input.outputFormat,
      character_count: input.characterCount,
      status: 'available',
    })
    .select('*')
    .single<RoutineAudioNarration>();

  throwIfSupabaseError(error, 'Failed to create routine audio narration.');
  return data;
}
