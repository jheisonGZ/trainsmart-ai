import { randomUUID } from 'node:crypto';

import { elevenLabsConfig } from '../config/elevenlabs';
import { generateSpeechFromText } from '../lib/elevenlabs';
import { logger } from '../lib/logger';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import { PreconditionFailedError } from '../utils/api-response';
import { createRoutineAudioSignedUrl, uploadRoutineAudio } from './audioStorage.service';

function ensureElevenLabsEnabled() {
  if (!elevenLabsConfig.enabled) {
    throw new PreconditionFailedError('ElevenLabs text-to-speech is disabled.');
  }
}

function buildGreetingText(displayName: string | null, localHour: number | null) {
  const hour = localHour ?? new Date().getHours();
  const timeGreeting =
    hour < 12 ? 'Buenos dias' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const name = displayName?.trim();

  return name
    ? `${timeGreeting}, ${name}. Bienvenido de nuevo a TrainSmart AI. Es hora de entrenar.`
    : `${timeGreeting}. Bienvenido a TrainSmart AI. Es hora de entrenar.`;
}

export async function generateLoginGreeting(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  displayName: string | null,
  localHour: number | null,
) {
  ensureElevenLabsEnabled();

  const text = buildGreetingText(displayName, localHour);

  logger.info('Login greeting generation started', {
    userId: auth.userId,
    characterCount: text.length,
  });

  const audio = await generateSpeechFromText({
    text,
    voiceId: elevenLabsConfig.voiceId,
    modelId: elevenLabsConfig.modelId,
    outputFormat: elevenLabsConfig.outputFormat,
  });

  const audioStoragePath = `greetings/${auth.userId}/${randomUUID()}.mp3`;
  await uploadRoutineAudio(supabase, audioStoragePath, audio);
  const access = await createRoutineAudioSignedUrl(supabase, audioStoragePath);

  logger.info('Login greeting generation completed', { userId: auth.userId });

  return {
    audioUrl: access.audioUrl,
    expiresIn: access.expiresIn,
  };
}
