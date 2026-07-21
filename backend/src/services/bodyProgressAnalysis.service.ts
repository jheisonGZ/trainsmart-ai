import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { env } from '../config/env';
import { analyzeImageWithPrompt } from '../lib/gemini-vision';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import {
  createBodyProgressAnalysis,
  deleteAllBodyProgressAnalyses,
  listBodyProgressAnalyses,
} from '../repositories/body-progress-analysis.repository';
import type { AuthUser } from '../types/auth.types';
import { ValidationError } from '../utils/api-response';
import {
  buildImageStoragePath,
  createImageSignedUrl,
  removeImages,
  uploadImage,
} from './imageStorage.service';

const BODY_PROGRESS_PROMPT = [
  'Eres un asistente de fitness. Mira esta imagen y determina primero si muestra a una',
  'persona (una foto de progreso corporal).',
  'Si la imagen NO muestra a una persona (por ejemplo es comida, un objeto, un paisaje, etc),',
  'responde solo con este JSON exacto, sin texto adicional ni markdown:',
  '{"is_person": false, "description": ""}',
  'Si SI muestra a una persona, analiza la foto de progreso corporal de forma objetiva,',
  'respetuosa y no clinica. Describe en 3-4 oraciones en espanol: postura visible,',
  'complexion general y cualquier observacion relevante para entrenamiento.',
  'No hagas diagnosticos medicos ni des un porcentaje exacto de grasa corporal,',
  'solo observaciones cualitativas generales.',
  'Responde solo con este JSON exacto, sin texto adicional ni markdown:',
  '{"is_person": true, "description": "tu descripcion aqui"}',
].join(' ');

const bodyProgressResultSchema = z.object({
  is_person: z.boolean().default(true),
  description: z.string().default(''),
});

function parseBodyProgressResult(rawText: string) {
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fencedMatch?.[1]?.trim() ?? rawText.trim();

  try {
    const parsed = bodyProgressResultSchema.safeParse(JSON.parse(jsonText));

    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // fall through to the raw-text fallback below
  }

  return { is_person: true, description: rawText.trim() };
}

export async function analyzeAndSaveBodyProgressImage(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  image: Buffer,
  mimeType: string,
) {
  const rawText = await analyzeImageWithPrompt(image, mimeType, BODY_PROGRESS_PROMPT);
  const { is_person, description } = parseBodyProgressResult(rawText);

  if (!is_person) {
    throw new ValidationError(
      'La imagen no parece mostrar a una persona. Sube una foto tuya de progreso corporal.',
    );
  }

  const analysisText = description;
  const path = buildImageStoragePath('body-progress-images', auth.userId, `${randomUUID()}.jpg`);

  await uploadImage(supabase, env.SUPABASE_BODY_PROGRESS_IMAGES_BUCKET, path, image, mimeType);

  const record = await createBodyProgressAnalysis(supabase, {
    userId: auth.userId,
    imageStoragePath: path,
    analysisText,
  });

  const access = await createImageSignedUrl(
    supabase,
    env.SUPABASE_BODY_PROGRESS_IMAGES_BUCKET,
    path,
  );

  return { ...record, image_url: access.imageUrl };
}

export async function listMyBodyProgressAnalyses(supabase: RequestSupabaseClient, auth: AuthUser) {
  return listBodyProgressAnalyses(supabase, auth.userId);
}

export async function clearMyBodyProgressAnalyses(supabase: RequestSupabaseClient, auth: AuthUser) {
  const imagePaths = await deleteAllBodyProgressAnalyses(supabase, auth.userId);
  await removeImages(supabase, env.SUPABASE_BODY_PROGRESS_IMAGES_BUCKET, imagePaths);
}
