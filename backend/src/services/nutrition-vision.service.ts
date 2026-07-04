import { randomUUID } from 'crypto';

import { env } from '../config/env';
import { analyzeImageTagsWithXimilar } from '../integrations/ximilar/client';
import { getProfileByUserId } from '../repositories/profiles.repository';
import {
  createMealAnalysis,
  getLatestMealAnalysisByUserId,
  listMealAnalysesByUserId,
} from '../repositories/nutrition-vision.repository';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import type {
  MealAnalysis,
  MealAnalysisResponse,
  NutritionVisionTag,
} from '../types/nutrition-vision.types';
import {
  buildVisionImageStoragePath,
  createVisionImageSignedUrl,
  uploadVisionImage,
} from './visionImageStorage.service';
import {
  getTopTagNames,
  normalizeAndSortVisionTags,
  parseImageDataUrl,
  pickOutputsFromRules,
} from './visionShared.service';
import type { AnalyzeNutritionInput } from '../validators/nutrition-vision.schemas';

const FOOD_GROUP_RULES: Array<{ labels: string[]; output: string }> = [
  {
    labels: [
      'chicken',
      'meat',
      'beef',
      'pork',
      'fish',
      'salmon',
      'tuna',
      'egg',
      'eggs',
      'seafood',
      'shrimp',
      'tofu',
      'bean',
      'beans',
      'lentils',
      'cheese',
      'yogurt',
    ],
    output: 'proteina',
  },
  {
    labels: [
      'rice',
      'bread',
      'pasta',
      'noodle',
      'potato',
      'cereal',
      'oat',
      'oats',
      'tortilla',
    ],
    output: 'carbohidratos',
  },
  {
    labels: [
      'vegetable',
      'salad',
      'broccoli',
      'spinach',
      'carrot',
      'tomato',
      'cucumber',
      'lettuce',
      'greens',
    ],
    output: 'vegetales',
  },
  {
    labels: ['fruit', 'banana', 'apple', 'berries', 'orange', 'avocado'],
    output: 'fruta',
  },
  {
    labels: ['nuts', 'almond', 'peanut', 'butter', 'oil', 'olive'],
    output: 'grasas',
  },
];

function buildMealSummary(groups: string[], topTags: string[]) {
  if (groups.length === 0) {
    return `No se detectaron componentes alimentarios claros. Tags visuales principales: ${
      topTags.join(', ') || 'sin tags relevantes'
    }.`;
  }

  return `El plato parece incluir ${groups.join(', ')}. Tags visuales principales: ${
    topTags.join(', ') || 'sin tags relevantes'
  }.`;
}

function buildEducationalFeedback(groups: string[]) {
  if (groups.length === 0) {
    return 'La imagen no permite identificar comida con claridad. Intenta una foto mas frontal, con mejor luz y enfocando el plato completo.';
  }

  const notes: string[] = [];

  if (!groups.includes('proteina')) {
    notes.push('La fuente de proteina no es clara en la imagen.');
  }

  if (!groups.includes('vegetales') && !groups.includes('fruta')) {
    notes.push('No se aprecia un componente vegetal o de fruta con claridad.');
  }

  if (!groups.includes('carbohidratos')) {
    notes.push('No se identifica con claridad una fuente principal de carbohidratos.');
  }

  if (notes.length === 0) {
    return 'La composicion visual se ve relativamente balanceada. Toma esta lectura solo como orientacion educativa, no como evaluacion nutricional exacta.';
  }

  return `${notes.join(' ')} Usa esta lectura como orientacion visual aproximada, no como medicion clinica ni calorica.`;
}

function buildGoalAlignment(goal: string | null | undefined, groups: string[]) {
  switch (goal) {
    case 'gain_muscle':
      return groups.includes('proteina')
        ? 'Para ganancia muscular, la presencia visual de proteina es una buena señal. Revisa tambien cantidad total y distribucion diaria.'
        : 'Para ganancia muscular, revisa si realmente estas incluyendo una fuente clara de proteina en este plato.';
    case 'lose_fat':
      return groups.includes('proteina') && (groups.includes('vegetales') || groups.includes('fruta'))
        ? 'Para perdida de grasa, la combinacion visible de proteina y vegetales/fruta va en una direccion razonable.'
        : 'Para perdida de grasa, suele ayudar una mejor presencia de proteina magra y componentes vegetales visibles.';
    case 'strength':
      return 'Para objetivo de fuerza, busca coherencia entre energia disponible, recuperacion y una fuente clara de proteina.';
    case 'mobility':
      return 'Para movilidad y bienestar general, prioriza consistencia, variedad y una composicion facil de sostener en el tiempo.';
    default:
      return 'Para condicion fisica general, busca platos visualmente mas completos y sostenibles, con proteina, vegetales y alguna fuente de energia.';
  }
}

async function enrichMealAnalysis(
  supabase: RequestSupabaseClient,
  analysis: MealAnalysis | null,
): Promise<MealAnalysisResponse | null> {
  if (!analysis) {
    return null;
  }

  const signedUrl = await createVisionImageSignedUrl(
    supabase,
    env.SUPABASE_MEAL_IMAGES_BUCKET,
    analysis.source_image_path,
  );

  return {
    ...analysis,
    source_image_url: signedUrl.imageUrl,
  };
}

async function enrichMealAnalyses(
  supabase: RequestSupabaseClient,
  analyses: MealAnalysis[],
) {
  return Promise.all(analyses.map((analysis) => enrichMealAnalysis(supabase, analysis)));
}

export async function analyzeMyMeal(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  input: AnalyzeNutritionInput,
) {
  const { contentType, extension, base64Payload, imageBuffer } = parseImageDataUrl(
    input.image_data_url,
  );
  const analysisId = randomUUID();
  const storagePath = buildVisionImageStoragePath('meal', auth.userId, analysisId, extension);
  const [ximilarResult, profile] = await Promise.all([
    analyzeImageTagsWithXimilar({ imageBase64: base64Payload }),
    getProfileByUserId(supabase, auth.userId),
  ]);

  const tags = normalizeAndSortVisionTags(
    (ximilarResult.records[0]?._tags ?? []).map((tag) => ({
      name: tag.name,
      prob: tag.prob,
    })),
  ) as NutritionVisionTag[];
  const detectedFoodGroups = pickOutputsFromRules(tags, FOOD_GROUP_RULES);
  const topTags = getTopTagNames(tags);
  const summary = buildMealSummary(detectedFoodGroups, topTags);
  const educationalFeedback = buildEducationalFeedback(detectedFoodGroups);
  const goalAlignment = buildGoalAlignment(profile?.goal, detectedFoodGroups);

  await uploadVisionImage(
    supabase,
    env.SUPABASE_MEAL_IMAGES_BUCKET,
    storagePath,
    imageBuffer,
    contentType,
  );

  const analysis = await createMealAnalysis(supabase, {
    id: analysisId,
    user_id: auth.userId,
    source_image_path: storagePath,
    source_image_content_type: contentType,
    ximilar_model: 'photo/tags/v2/tags',
    detected_tags: tags,
    detected_food_groups: detectedFoodGroups,
    summary,
    educational_feedback: educationalFeedback,
    goal_alignment: goalAlignment,
    ximilar_response: ximilarResult,
  });

  return enrichMealAnalysis(supabase, analysis);
}

export async function getMyLatestMealAnalysis(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
) {
  const analysis = await getLatestMealAnalysisByUserId(supabase, auth.userId);
  return enrichMealAnalysis(supabase, analysis);
}

export async function listMyMealAnalyses(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  limit = 5,
) {
  const analyses = await listMealAnalysesByUserId(supabase, auth.userId, limit);
  return enrichMealAnalyses(supabase, analyses);
}
