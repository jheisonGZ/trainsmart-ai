import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { env } from '../config/env';
import { analyzeImageWithPrompt } from '../lib/gemini-vision';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import {
  createMealAnalysis,
  deleteAllMealAnalyses,
  listMealAnalyses,
} from '../repositories/meal-analysis.repository';
import type { AuthUser } from '../types/auth.types';
import {
  buildImageStoragePath,
  createImageSignedUrl,
  removeImages,
  uploadImage,
} from './imageStorage.service';

const MEAL_PROMPT = [
  'Eres un nutricionista asistente. Mira esta foto de un plato de comida e identifica',
  'que alimentos contiene y estima sus calorias y macronutrientes totales para la',
  'porcion mostrada.',
  'Responde solo con este JSON exacto, sin texto adicional ni markdown:',
  '{"food_names": ["alimento1", "alimento2"], "calories": 000, "protein_g": 00, "carbs_g": 00, "fat_g": 00}',
  'Si no puedes estimar un valor con confianza, usa null en ese campo.',
].join(' ');

const mealResultSchema = z.object({
  food_names: z.array(z.string()).default([]),
  calories: z.number().nullable().default(null),
  protein_g: z.number().nullable().default(null),
  carbs_g: z.number().nullable().default(null),
  fat_g: z.number().nullable().default(null),
});

function parseMealResult(rawText: string) {
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fencedMatch?.[1]?.trim() ?? rawText.trim();

  try {
    const parsed = mealResultSchema.safeParse(JSON.parse(jsonText));

    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // fall through to the empty fallback below
  }

  return { food_names: [], calories: null, protein_g: null, carbs_g: null, fat_g: null };
}

export async function analyzeAndSaveMealImage(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  image: Buffer,
  mimeType: string,
) {
  const rawText = await analyzeImageWithPrompt(image, mimeType, MEAL_PROMPT);
  const analysis = parseMealResult(rawText);
  const path = buildImageStoragePath('meal-images', auth.userId, `${randomUUID()}.jpg`);

  await uploadImage(supabase, env.SUPABASE_MEAL_IMAGES_BUCKET, path, image, mimeType);

  const record = await createMealAnalysis(supabase, {
    userId: auth.userId,
    imageStoragePath: path,
    foodNames: analysis.food_names,
    calories: analysis.calories,
    proteinG: analysis.protein_g,
    carbsG: analysis.carbs_g,
    fatG: analysis.fat_g,
    rawResponse: { rawText },
  });

  const access = await createImageSignedUrl(supabase, env.SUPABASE_MEAL_IMAGES_BUCKET, path);

  return { ...record, image_url: access.imageUrl };
}

export async function listMyMealAnalyses(supabase: RequestSupabaseClient, auth: AuthUser) {
  return listMealAnalyses(supabase, auth.userId);
}

export async function clearMyMealAnalyses(supabase: RequestSupabaseClient, auth: AuthUser) {
  const imagePaths = await deleteAllMealAnalyses(supabase, auth.userId);
  await removeImages(supabase, env.SUPABASE_MEAL_IMAGES_BUCKET, imagePaths);
}
