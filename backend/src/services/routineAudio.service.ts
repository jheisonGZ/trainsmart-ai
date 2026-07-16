import { elevenLabsConfig } from '../config/elevenlabs';
import { generateSpeechFromText } from '../lib/elevenlabs';
import { logger } from '../lib/logger';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import {
  createRoutineAudioNarration,
  getAvailableRoutineAudioBySession,
} from '../repositories/routine-audio.repository';
import { getRoutineDayById, getRoutineVersionById } from '../repositories/routines.repository';
import {
  getSessionById,
  getSessionExercises,
} from '../repositories/sessions.repository';
import type { AuthUser } from '../types/auth.types';
import type { RoutineDay, RoutineVersion } from '../types/routine.types';
import type { WorkoutSession } from '../types/session.types';
import {
  ConflictError,
  NotFoundError,
  PreconditionFailedError,
} from '../utils/api-response';
import {
  buildRoutineAudioStoragePath,
  createRoutineAudioSignedUrl,
  uploadRoutineAudio,
} from './audioStorage.service';
import { buildRoutineNarrationText } from './routineNarrationText.service';

interface RoutineAudioAccessResponse {
  audioUrl: string;
  expiresIn: number;
  narrationTextPreview?: string;
  status: 'available';
}

function ensureSessionAllowsAudio(session: WorkoutSession) {
  if (!session.started_at) {
    throw new ConflictError('Workout session has not started.');
  }
}

function ensureElevenLabsEnabled() {
  if (!elevenLabsConfig.enabled) {
    throw new PreconditionFailedError('ElevenLabs text-to-speech is disabled.');
  }
}

async function createAccessResponse(
  supabase: RequestSupabaseClient,
  audioStoragePath: string,
  narrationText?: string,
): Promise<RoutineAudioAccessResponse> {
  const access = await createRoutineAudioSignedUrl(supabase, audioStoragePath);

  return {
    ...access,
    narrationTextPreview: narrationText ? narrationText.slice(0, 240) : undefined,
    status: 'available',
  };
}

async function getSessionRoutineContext(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  session: WorkoutSession,
) {
  let version: (RoutineVersion & { routine: { id: string } }) | null = null;
  let day: RoutineDay | null = null;

  if (session.routine_version_id) {
    version = await getRoutineVersionById(
      supabase,
      session.routine_version_id,
      auth.userId,
    );
  }

  if (session.routine_day_id) {
    day = await getRoutineDayById(supabase, session.routine_day_id);
  }

  if (!version) {
    throw new NotFoundError('Approved routine version for this session was not found.');
  }

  if (version.approval_status !== 'approved') {
    throw new ConflictError('Routine audio requires an approved routine version.');
  }

  return { version, day };
}

export async function getRoutineAudioAccess(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  workoutSessionId: string,
) {
  ensureElevenLabsEnabled();

  const session = await getSessionById(supabase, workoutSessionId, auth.userId);
  ensureSessionAllowsAudio(session);

  const existingAudio = await getAvailableRoutineAudioBySession(
    supabase,
    auth.userId,
    workoutSessionId,
  );

  if (!existingAudio) {
    throw new NotFoundError('Routine audio narration not found.');
  }

  logger.info('Routine audio access granted', {
    sessionId: workoutSessionId,
    userId: auth.userId,
    provider: existingAudio.provider,
  });

  return createAccessResponse(supabase, existingAudio.audio_storage_path);
}

export async function generateOrGetRoutineAudio(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  workoutSessionId: string,
) {
  ensureElevenLabsEnabled();

  const session = await getSessionById(supabase, workoutSessionId, auth.userId);
  ensureSessionAllowsAudio(session);

  const existingAudio = await getAvailableRoutineAudioBySession(
    supabase,
    auth.userId,
    workoutSessionId,
  );

  if (existingAudio) {
    logger.info('Routine audio reused', {
      sessionId: workoutSessionId,
      userId: auth.userId,
      provider: existingAudio.provider,
      characterCount: existingAudio.character_count,
    });

    return createAccessResponse(
      supabase,
      existingAudio.audio_storage_path,
      existingAudio.narration_text,
    );
  }

  const [{ version, day }, exercises] = await Promise.all([
    getSessionRoutineContext(supabase, auth, session),
    getSessionExercises(supabase, workoutSessionId),
  ]);
  const narrationText = buildRoutineNarrationText({ version, day, exercises });
  const audioStoragePath = buildRoutineAudioStoragePath(auth.userId, workoutSessionId);

  logger.info('Routine audio generation started', {
    sessionId: workoutSessionId,
    userId: auth.userId,
    provider: 'elevenlabs',
    characterCount: narrationText.length,
  });

  const audio = await generateSpeechFromText({
    text: narrationText,
    voiceId: elevenLabsConfig.voiceId,
    modelId: elevenLabsConfig.modelId,
    outputFormat: elevenLabsConfig.outputFormat,
  });

  await uploadRoutineAudio(supabase, audioStoragePath, audio);

  const audioMetadata = await createRoutineAudioNarration(supabase, {
    userId: auth.userId,
    routineId: version.routine.id,
    routineVersionId: version.id,
    workoutSessionId,
    dayIndex: day?.day_index ?? null,
    voiceId: elevenLabsConfig.voiceId,
    modelId: elevenLabsConfig.modelId,
    narrationText,
    audioStoragePath,
    outputFormat: elevenLabsConfig.outputFormat,
    characterCount: narrationText.length,
  });

  logger.info('Routine audio generation completed', {
    sessionId: workoutSessionId,
    userId: auth.userId,
    provider: audioMetadata.provider,
    characterCount: audioMetadata.character_count,
  });

  return createAccessResponse(
    supabase,
    audioMetadata.audio_storage_path,
    audioMetadata.narration_text,
  );
}

