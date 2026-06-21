import { elevenLabsConfig } from '../config/elevenlabs';
import { generateSpeechFromText } from '../lib/elevenlabs';
import { logger } from '../lib/logger';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import { getProfileByUserId } from '../repositories/profiles.repository';
import type { AuthUser } from '../types/auth.types';
import { PreconditionFailedError } from '../utils/api-response';
import type { SpeechAudioInput } from '../validators/greetings.schemas';

function getFirstName(auth: AuthUser, profileName?: string | null) {
  const metadataName =
    typeof auth.userMetadata.full_name === 'string'
      ? auth.userMetadata.full_name
      : typeof auth.userMetadata.name === 'string'
        ? auth.userMetadata.name
        : typeof auth.userMetadata.display_name === 'string'
          ? auth.userMetadata.display_name
          : null;

  const candidate = profileName ?? metadataName ?? auth.email.split('@')[0] ?? 'Atleta';
  return candidate.trim().split(/\s+/)[0] || 'Atleta';
}

function getGreetingText(firstName: string) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Buenos dias' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return `${greeting}, ${firstName}. Bienvenido a TrainSmart AI. Ya puedes continuar con tu rutina personalizada de hoy.`;
}

export async function generateWelcomeGreetingAudio(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
) {
  if (!elevenLabsConfig.enabled) {
    throw new PreconditionFailedError('ElevenLabs text-to-speech is disabled.');
  }

  const profile = await getProfileByUserId(supabase, auth.userId);
  const firstName = getFirstName(auth, profile?.name);
  const text = getGreetingText(firstName);

  logger.info('Welcome greeting audio generation started', {
    userId: auth.userId,
    provider: 'elevenlabs',
    characterCount: text.length,
  });

  const audio = await generateSpeechFromText({
    text,
    voiceId: elevenLabsConfig.voiceId,
    modelId: elevenLabsConfig.modelId,
    outputFormat: elevenLabsConfig.outputFormat,
  });

  logger.info('Welcome greeting audio generation completed', {
    userId: auth.userId,
    provider: 'elevenlabs',
    characterCount: text.length,
  });

  return audio;
}

export async function generateSpeechAudio(auth: AuthUser, input: SpeechAudioInput) {
  if (!elevenLabsConfig.enabled) {
    throw new PreconditionFailedError('ElevenLabs text-to-speech is disabled.');
  }

  logger.info('Short speech audio generation started', {
    userId: auth.userId,
    provider: 'elevenlabs',
    context: input.context,
    characterCount: input.text.length,
  });

  const audio = await generateSpeechFromText({
    text: input.text,
    voiceId: elevenLabsConfig.voiceId,
    modelId: elevenLabsConfig.modelId,
    outputFormat: elevenLabsConfig.outputFormat,
  });

  logger.info('Short speech audio generation completed', {
    userId: auth.userId,
    provider: 'elevenlabs',
    context: input.context,
    characterCount: input.text.length,
  });

  return audio;
}
