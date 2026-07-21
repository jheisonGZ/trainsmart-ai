import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { env } from '../config/env';
import { analyzeImageWithPrompt } from '../lib/gemini-vision';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import {
  createEnvironmentAnalysis,
  deleteAllEnvironmentAnalyses,
  listEnvironmentAnalyses,
} from '../repositories/environment-analysis.repository';
import type { AuthUser } from '../types/auth.types';
import { ValidationError } from '../utils/api-response';
import {
  buildImageStoragePath,
  createImageSignedUrl,
  removeImages,
  uploadImage,
} from './imageStorage.service';

const ENVIRONMENT_PROMPT = [
  'Eres un asistente de fitness. Mira esta imagen y determina primero si muestra un espacio',
  'de entrenamiento (gimnasio o casa) o equipamiento de ejercicio visible.',
  'Si la imagen NO muestra nada relacionado con entrenamiento (por ejemplo comida, una persona',
  'sin contexto de gimnasio, un paisaje no relacionado, etc), responde solo con este JSON',
  'exacto, sin texto adicional ni markdown: {"is_environment": false, "equipment": [], "summary": ""}',
  'Si SI es un espacio o equipo de entrenamiento, identifica que equipamiento de ejercicio es',
  'visible (ej: mancuernas, barra, banco, maquina de poleas, banda elastica, kettlebell, etc).',
  'Responde solo con este JSON exacto, sin texto adicional ni markdown:',
  '{"is_environment": true, "equipment": ["item1", "item2"], "summary": "resumen breve en espanol de 1-2 oraciones sobre que rutinas se podrian hacer con este equipo"}',
].join(' ');

const environmentResultSchema = z.object({
  is_environment: z.boolean().default(true),
  equipment: z.array(z.string()).default([]),
  summary: z.string().default(''),
});

function parseEnvironmentResult(rawText: string) {
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fencedMatch?.[1]?.trim() ?? rawText.trim();

  try {
    const parsed = environmentResultSchema.safeParse(JSON.parse(jsonText));

    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // fall through to the raw-text fallback below
  }

  return { is_environment: true, equipment: [], summary: rawText.trim() };
}

export async function analyzeAndSaveEnvironmentImage(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  image: Buffer,
  mimeType: string,
) {
  const rawText = await analyzeImageWithPrompt(image, mimeType, ENVIRONMENT_PROMPT);
  const { is_environment, equipment, summary } = parseEnvironmentResult(rawText);

  if (!is_environment) {
    throw new ValidationError(
      'La imagen no parece mostrar un espacio o equipo de entrenamiento. Sube una foto de tu gimnasio o equipo.',
    );
  }

  const path = buildImageStoragePath('environment-images', auth.userId, `${randomUUID()}.jpg`);

  await uploadImage(supabase, env.SUPABASE_ENVIRONMENT_IMAGES_BUCKET, path, image, mimeType);

  const record = await createEnvironmentAnalysis(supabase, {
    userId: auth.userId,
    imageStoragePath: path,
    equipmentDetected: equipment,
    analysisText: summary,
  });

  const access = await createImageSignedUrl(
    supabase,
    env.SUPABASE_ENVIRONMENT_IMAGES_BUCKET,
    path,
  );

  return { ...record, image_url: access.imageUrl };
}

export async function listMyEnvironmentAnalyses(supabase: RequestSupabaseClient, auth: AuthUser) {
  return listEnvironmentAnalyses(supabase, auth.userId);
}

export async function clearMyEnvironmentAnalyses(supabase: RequestSupabaseClient, auth: AuthUser) {
  const imagePaths = await deleteAllEnvironmentAnalyses(supabase, auth.userId);
  await removeImages(supabase, env.SUPABASE_ENVIRONMENT_IMAGES_BUCKET, imagePaths);
}
