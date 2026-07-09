import { z } from 'zod';

export const speechAudioSchema = z.object({
  text: z.string().trim().min(1).max(500),
  context: z.enum(['timer', 'session', 'routine']).default('session'),
});

export type SpeechAudioInput = z.infer<typeof speechAudioSchema>;
