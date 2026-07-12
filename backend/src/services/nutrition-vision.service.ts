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
import { logger } from '../lib/logger';
import type { AuthUser } from '../types/auth.types';
import type {
  FoodGroupAssessment,
  FoodGroupKey,
  MealAnalysis,
  MealAnalysisResponse,
  NutritionVisionTag,
} from '../types/nutrition-vision.types';
import {
  buildVisionImageStoragePath,
  createVisionImageSignedUrlSafely,
  uploadVisionImage,
} from './visionImageStorage.service';
import {
  getRecognizedFoodTagNames,
  normalizeAndSortVisionTags,
  parseImageDataUrl,
  pickOutputsFromRules,
} from './visionShared.service';
import type { AnalyzeNutritionInput } from '../validators/nutrition-vision.schemas';

const FOOD_GROUP_RULES: Array<{ labels: string[]; output: FoodGroupKey }> = [
  {
    labels: [
      'chicken',
      'poultry',
      'turkey',
      'meat',
      'beef',
      'pork',
      'ham',
      'bacon',
      'sausage',
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
      'chickpea',
      'chickpeas',
      'edamame',
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
      'noodles',
      'potato',
      'cereal',
      'oat',
      'oats',
      'tortilla',
      'grain',
      'grains',
      'quinoa',
      'couscous',
      'corn',
      'bun',
    ],
    output: 'carbohidratos',
  },
  {
    labels: [
      'vegetable',
      'vegetables',
      'salad',
      'broccoli',
      'spinach',
      'carrot',
      'tomato',
      'cucumber',
      'lettuce',
      'greens',
      'pepper',
      'onion',
      'kale',
      'cabbage',
      'zucchini',
      'mushroom',
    ],
    output: 'vegetales',
  },
  {
    labels: [
      'fruit',
      'banana',
      'apple',
      'berries',
      'orange',
      'avocado',
      'grape',
      'grapes',
      'mango',
      'pineapple',
      'strawberry',
      'watermelon',
      'melon',
      'pear',
    ],
    output: 'fruta',
  },
  {
    labels: ['nuts', 'almond', 'peanut', 'butter', 'oil', 'olive', 'avocado', 'seed', 'seeds', 'sesame', 'coconut'],
    output: 'grasas',
  },
];

const ALL_FOOD_GROUPS: FoodGroupKey[] = ['proteina', 'carbohidratos', 'vegetales', 'fruta', 'grasas'];

const FOOD_GROUP_LABELS: Record<FoodGroupKey, string> = {
  proteina: 'proteinas',
  carbohidratos: 'carbohidratos',
  vegetales: 'verduras',
  fruta: 'frutas',
  grasas: 'grasas saludables',
};

function buildMealSummary(groups: FoodGroupKey[], foodTagNames: string[]) {
  if (foodTagNames.length === 0) {
    return 'No se lograron identificar alimentos con claridad en la imagen. Intenta una foto mas frontal, con mejor luz y enfocando el plato completo.';
  }

  const groupLabels = groups.map((group) => FOOD_GROUP_LABELS[group]);

  return groupLabels.length > 0
    ? `Alimentos visibles en la imagen: ${foodTagNames.join(', ')}. Grupos identificados: ${groupLabels.join(', ')}.`
    : `Alimentos visibles en la imagen: ${foodTagNames.join(', ')}.`;
}

function getMissingFoodGroups(groups: FoodGroupKey[]) {
  return ALL_FOOD_GROUPS.filter((group) => !groups.includes(group));
}

function buildBalanceExplanation(groups: FoodGroupKey[]) {
  if (groups.length === 0) {
    return 'No se distingue un plato con suficiente claridad para evaluar su balance visual.';
  }

  const hasProtein = groups.includes('proteina');
  const hasCarbs = groups.includes('carbohidratos');
  const hasProduce = groups.includes('vegetales') || groups.includes('fruta');
  const hasFat = groups.includes('grasas');

  if (hasProtein && hasCarbs && hasProduce) {
    return hasFat
      ? 'El plato se ve visualmente equilibrado: incluye proteina, una fuente de energia, y vegetales o fruta, ademas de grasas saludables.'
      : 'El plato se ve bastante equilibrado: tiene proteina, energia y vegetales o fruta. Podria faltar una grasa saludable visible.';
  }

  if (hasProtein && hasCarbs && !hasProduce) {
    return 'El plato muestra proteina y energia, pero le faltan vegetales o fruta para completar el balance visual.';
  }

  if (hasProtein && !hasCarbs && hasProduce) {
    return 'Hay proteina y componentes frescos, pero no se aprecia con claridad una fuente de energia (carbohidratos).';
  }

  if (!hasProtein && hasCarbs && hasProduce) {
    return 'Se ven energia y vegetales o fruta, pero la fuente de proteina no es clara en la imagen.';
  }

  if (hasProtein && !hasCarbs && !hasProduce) {
    return 'Solo se distingue con claridad la proteina; faltan carbohidratos y vegetales o fruta para un plato mas completo.';
  }

  if (!hasProtein) {
    return 'La foto no muestra una proteina clara; ese suele ser el punto mas importante a revisar.';
  }

  return 'Hay proteina visible, pero faltan senales claras de vegetales o fruta para completar mejor el plato.';
}

function assessFoodGroup(tags: NutritionVisionTag[], labels: string[]): FoodGroupAssessment {
  const matched = tags.filter((tag) => labels.includes(tag.name.toLowerCase()));

  if (matched.length === 0) {
    return 'no_identificable';
  }

  const avgProb = matched.reduce((sum, tag) => sum + tag.prob, 0) / matched.length;

  if (avgProb >= 0.75) {
    return 'excelente';
  }

  if (avgProb >= 0.55) {
    return 'adecuado';
  }

  return 'escaso';
}

function buildCategoryAssessment(tags: NutritionVisionTag[]): Record<FoodGroupKey, FoodGroupAssessment> {
  const result = {} as Record<FoodGroupKey, FoodGroupAssessment>;

  for (const rule of FOOD_GROUP_RULES) {
    result[rule.output] = assessFoodGroup(tags, rule.labels);
  }

  return result;
}

const ASSESSMENT_SCORE: Record<FoodGroupAssessment, number> = {
  excelente: 2,
  adecuado: 1.4,
  escaso: 0.6,
  no_identificable: 0,
};

function buildBalanceScore(categoryAssessment: Record<FoodGroupKey, FoodGroupAssessment>) {
  const total = ALL_FOOD_GROUPS.reduce(
    (sum, group) => sum + ASSESSMENT_SCORE[categoryAssessment[group]],
    0,
  );

  return Math.round(total * 10) / 10;
}

const BALANCE_SCORE_NOTE =
  'Puntuacion aproximada de 0 a 10 basada unicamente en lo que se distingue en la foto. No es una medicion nutricional exacta.';

function buildUncertaintyNotes(
  categoryAssessment: Record<FoodGroupKey, FoodGroupAssessment>,
  tags: NutritionVisionTag[],
): string[] {
  const notes: string[] = [];

  if (tags.length === 0) {
    notes.push('La imagen no ofrece suficientes referencias visuales para un analisis confiable.');
    return notes;
  }

  for (const group of ALL_FOOD_GROUPS) {
    if (categoryAssessment[group] === 'escaso') {
      notes.push(
        `No es posible confirmar con certeza ${FOOD_GROUP_LABELS[group]} en la imagen; podrian estar presentes pero poco visibles.`,
      );
    }
  }

  return notes;
}

const GOAL_PREFIXES: Record<string, string> = {
  gain_muscle: 'Para tu objetivo de ganar masa muscular: ',
  lose_fat: 'Para tu objetivo de perder grasa: ',
  strength: 'Para tu objetivo de fuerza: ',
  mobility: 'Para tu objetivo de movilidad y bienestar: ',
};

const GROUP_TIPS: Record<FoodGroupKey, string> = {
  proteina: 'añade una fuente de proteina mas visible (carne, huevo, legumbres, tofu, lacteos).',
  carbohidratos: 'incluye una fuente de carbohidratos mas clara (arroz, papa, pan, pasta).',
  vegetales: 'suma mas vegetales o ensalada para completar el plato.',
  fruta: 'considera acompañar la comida con una porcion de fruta.',
  grasas: 'agrega una grasa saludable visible, como aguacate, frutos secos o aceite de oliva.',
};

function buildRecommendations(
  goal: string | null | undefined,
  categoryAssessment: Record<FoodGroupKey, FoodGroupAssessment>,
): string[] {
  const prefix = (goal && GOAL_PREFIXES[goal]) || 'Como orientacion general: ';

  const weakGroups = ALL_FOOD_GROUPS.filter(
    (group) =>
      categoryAssessment[group] === 'escaso' || categoryAssessment[group] === 'no_identificable',
  );

  if (weakGroups.length === 0) {
    return [`${prefix}el plato ya se ve bastante completo; manten esta variedad visual en tus proximas comidas.`];
  }

  return weakGroups.slice(0, 3).map((group, index) =>
    index === 0 ? `${prefix}${GROUP_TIPS[group]}` : GROUP_TIPS[group].replace(/^./, (c) => c.toUpperCase()),
  );
}

const FINAL_DISCLAIMER =
  'Este analisis es unicamente una evaluacion visual con fines educativos, generada a partir de una foto. No calcula calorias ni macronutrientes y no reemplaza una valoracion nutricional profesional.';

async function enrichMealAnalysis(
  supabase: RequestSupabaseClient,
  analysis: MealAnalysis | null,
): Promise<MealAnalysisResponse | null> {
  if (!analysis) {
    return null;
  }

  const [signedUrl, profile] = await Promise.all([
    createVisionImageSignedUrlSafely(supabase, env.SUPABASE_MEAL_IMAGES_BUCKET, analysis.source_image_path),
    getProfileByUserId(supabase, analysis.user_id),
  ]);

  const groups = analysis.detected_food_groups as FoodGroupKey[];
  const categoryAssessment = buildCategoryAssessment(analysis.detected_tags);
  const balanceScore = buildBalanceScore(categoryAssessment);

  return {
    ...analysis,
    source_image_url: signedUrl?.imageUrl ?? null,
    balance_assessment: buildBalanceExplanation(groups),
    category_assessment: categoryAssessment,
    balance_score: balanceScore,
    balance_score_note: BALANCE_SCORE_NOTE,
    recommendations: buildRecommendations(profile?.goal, categoryAssessment),
    uncertainty_notes: buildUncertaintyNotes(categoryAssessment, analysis.detected_tags),
    disclaimer: FINAL_DISCLAIMER,
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
  const ximilarResult = await analyzeImageTagsWithXimilar({ imageBase64: base64Payload });

  const tags = normalizeAndSortVisionTags(
    (ximilarResult.records[0]?._tags ?? []).map((tag) => ({
      name: tag.name,
      prob: tag.prob,
    })),
  ) as NutritionVisionTag[];
  const detectedFoodGroups = pickOutputsFromRules(tags, FOOD_GROUP_RULES) as FoodGroupKey[];
  const foodTagNames = getRecognizedFoodTagNames(tags, FOOD_GROUP_RULES);
  const summary = buildMealSummary(detectedFoodGroups, foodTagNames);
  const balanceExplanation = buildBalanceExplanation(detectedFoodGroups);

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
    educational_feedback: balanceExplanation,
    goal_alignment: balanceExplanation,
    ximilar_response: ximilarResult,
  });

  return enrichMealAnalysis(supabase, analysis);
}

export async function getMyLatestMealAnalysis(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
) {
  try {
    const analysis = await getLatestMealAnalysisByUserId(supabase, auth.userId);
    return await enrichMealAnalysis(supabase, analysis);
  } catch (error) {
    logger.warn('Could not load latest meal analysis. Returning empty state instead.', {
      userId: auth.userId,
      error,
    });
    return null;
  }
}

export async function listMyMealAnalyses(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  limit = 5,
) {
  try {
    const analyses = await listMealAnalysesByUserId(supabase, auth.userId, limit);
    return await enrichMealAnalyses(supabase, analyses);
  } catch (error) {
    logger.warn('Could not load meal analysis history. Returning empty state instead.', {
      userId: auth.userId,
      limit,
      error,
    });
    return [];
  }
}
