import { randomUUID } from 'node:crypto';

import { elevenLabsConfig } from '../config/elevenlabs';
import { generateSpeechFromText } from '../lib/elevenlabs';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import { PreconditionFailedError } from '../utils/api-response';
import { createRoutineAudioSignedUrl, uploadRoutineAudio } from './audioStorage.service';

function ensureElevenLabsEnabled() {
  if (!elevenLabsConfig.enabled) {
    throw new PreconditionFailedError('ElevenLabs text-to-speech is disabled.');
  }
}

function buildFarewellText(displayName: string | null) {
  const name = displayName?.trim();

  return name ? `Hasta pronto, ${name}.` : 'Hasta pronto.';
}

export async function generateLogoutFarewell(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  displayName: string | null,
) {
  ensureElevenLabsEnabled();

  const text = buildFarewellText(displayName);

  const audio = await generateSpeechFromText({
    text,
    voiceId: elevenLabsConfig.voiceId,
    modelId: elevenLabsConfig.modelId,
    outputFormat: elevenLabsConfig.outputFormat,
  });

  const audioStoragePath = `farewells/${auth.userId}/${randomUUID()}.mp3`;
  await uploadRoutineAudio(supabase, audioStoragePath, audio);
  const access = await createRoutineAudioSignedUrl(supabase, audioStoragePath);

  return {
    audioUrl: access.audioUrl,
    expiresIn: access.expiresIn,
  };
}
