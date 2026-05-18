import { env } from './env';

export const elevenLabsConfig = {
  enabled: env.ELEVENLABS_ENABLED,
  apiKey: env.ELEVENLABS_API_KEY,
  voiceId: env.ELEVENLABS_VOICE_ID,
  modelId: env.ELEVENLABS_MODEL_ID,
  outputFormat: env.ELEVENLABS_OUTPUT_FORMAT,
  timeoutInSeconds: 45,
};
