import { env } from '../config/env';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import { ApiError } from '../utils/api-response';

const SIGNED_URL_EXPIRES_IN_SECONDS = 300;

function throwIfStorageError(error: { message: string } | null, message: string) {
  if (!error) {
    return;
  }

  throw new ApiError(503, message);
}

export function buildRoutineAudioStoragePath(userId: string, workoutSessionId: string) {
  return `routine-audio/${userId}/${workoutSessionId}/narration.mp3`;
}

export async function uploadRoutineAudio(
  supabase: RequestSupabaseClient,
  path: string,
  audio: Buffer,
) {
  const { error } = await supabase.storage
    .from(env.SUPABASE_ROUTINE_AUDIO_BUCKET)
    .upload(path, audio, {
      contentType: 'audio/mpeg',
      cacheControl: '3600',
      upsert: true,
    });

  throwIfStorageError(error, 'Failed to upload routine audio.');
}

export async function createRoutineAudioSignedUrl(
  supabase: RequestSupabaseClient,
  path: string,
) {
  const { data, error } = await supabase.storage
    .from(env.SUPABASE_ROUTINE_AUDIO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_IN_SECONDS);

  throwIfStorageError(error, 'Failed to create routine audio access URL.');

  if (!data?.signedUrl) {
    throw new ApiError(503, 'Failed to create routine audio access URL.');
  }

  return {
    audioUrl: data.signedUrl,
    expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
  };
}
