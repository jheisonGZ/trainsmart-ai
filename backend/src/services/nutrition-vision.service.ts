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

const ALL_FOOD_GROUPS = ['proteina', 'carbohidratos', 'vegetales', 'fruta', 'grasas'] as const;

function buildMealSummary(groups: string[], topTags: string[]) {
  if (groups.length === 0) {
    return `No se detectaron componentes alimentarios claros. Referencias visuales principales: ${
      topTags.join(', ') || 'sin tags relevantes'
    }.`;
  }

  return `El plato parece incluir ${groups.join(', ')}. Referencias visuales principales: ${
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

function getMissingFoodGroups(groups: string[]) {
  return ALL_FOOD_GROUPS.filter((group) => !groups.includes(group));
}

function buildBalanceAssessment(groups: string[]) {
  if (groups.length === 0) {
    return 'No se distingue un plato con suficiente claridad para evaluar su balance visual.';
  }

  const hasProtein = groups.includes('proteina');
  const hasCarbs = groups.includes('carbohidratos');
  const hasProduce = groups.includes('vegetales') || groups.includes('fruta');
  const hasFat = groups.includes('grasas');

  if (hasProtein && hasCarbs && hasProduce) {
    return hasFat
      ? 'El plato se ve visualmente balanceado: incluye proteina, energia, vegetales o fruta, y una fuente de grasa.'
      : 'El plato se ve bastante balanceado: tiene proteina, energia y vegetales o fruta. Podrias revisar si falta una grasa saludable.';
  }

  if (hasProtein && hasCarbs && !hasProduce) {
    return 'El plato tiene proteina y energia, pero le faltan vegetales o fruta para completar el balance visual.';
  }

  if (hasProtein && !hasCarbs && hasProduce) {
    return 'Hay proteina y componentes frescos, pero no se aprecia una fuente clara de energia (carbohidratos).';
  }

  if (!hasProtein && hasCarbs && hasProduce) {
    return 'Hay energia y vegetales o fruta, pero la fuente de proteina no es clara en la imagen.';
  }

  if (hasProtein && !hasCarbs && !hasProduce) {
    return 'Solo se distingue claramente la proteina; faltan carbohidratos y vegetales o fruta para un plato mas completo.';
  }

  if (!hasProtein) {
    return 'La foto no muestra una proteina clara; ese suele ser el punto mas importante a revisar.';
  }

  if (!hasProduce) {
    return 'Hay proteina visible, pero faltan senales claras de vegetales o fruta para completar mejor el plato.';
  }

  return 'La composicion visual parece util, aunque aun puede afinarse mejor.';
}

function buildPortionEstimate(groups: string[]) {
  if (groups.length >= 4) {
    return 'porcion visual amplia';
  }

  if (groups.length === 3) {
    return 'porcion visual media';
  }

  if (groups.length === 2) {
    return 'porcion visual ligera a media';
  }

  return 'porcion visual dificil de estimar';
}

function buildProteinStrength(
  tags: NutritionVisionTag[],
  groups: string[],
): string {
  if (!groups.includes('proteina')) {
    return 'No se detecta una fuente de proteina clara en el plato.';
  }

  const proteinLabels = [
    'chicken', 'meat', 'beef', 'pork', 'fish', 'salmon', 'tuna',
    'egg', 'eggs', 'seafood', 'shrimp', 'tofu', 'bean', 'beans',
    'lentils', 'cheese', 'yogurt',
  ];

  const proteinTags = tags.filter((tag) =>
    proteinLabels.includes(tag.name.toLowerCase()),
  );

  if (proteinTags.length === 0) {
    return 'Se identifico el grupo de proteina, pero no hay detalle claro sobre la fuente.';
  }

  const avgProb =
    proteinTags.reduce((sum, tag) => sum + tag.prob, 0) / proteinTags.length;

  if (avgProb >= 0.85 && proteinTags.length >= 2) {
    return 'La fuente de proteina se distingue con buena claridad en la imagen (porcion que parece adecuada).';
  }

  if (avgProb >= 0.7) {
    return 'Se identifica una fuente de proteina con razonable claridad; la porcion visual parece moderada.';
  }

  return 'Hay indicios de proteina, pero la imagen no permite estimar la porcion con certeza.';
}

function buildPortionDetail(
  groups: string[],
  tags: NutritionVisionTag[],
): string {
  const totalRelevant = tags.filter((tag) => tag.prob >= 0.5).length;

  if (groups.length === 0) {
    return 'No se pueden estimar porciones sin componentes alimentarios claros.';
  }

  if (groups.length >= 4 && totalRelevant >= 6) {
    return 'El plato muestra varios componentes con presencia notable; la porcion total parece completa.';
  }

  if (groups.length >= 3 && totalRelevant >= 4) {
    return 'Hay varios componentes visibles con buena presencia; la porcion parece razonable.';
  }

  if (groups.length === 2) {
    return 'El plato muestra pocos componentes; la porcion podria ser ligera o incompleta.';
  }

  return 'La porcion es dificil de estimar con precision a partir de la imagen.';
}

function buildPracticalTip(goal: string | null | undefined, groups: string[]) {
  const missing = getMissingFoodGroups(groups);

  switch (goal) {
    case 'gain_muscle':
      return groups.includes('proteina')
        ? 'Para ganar músculo, la lectura visual va en buena dirección; revisa además que la proteína total del día sea suficiente.'
        : 'Para ganar músculo, conviene añadir una fuente de proteína más clara en este plato.';
    case 'lose_fat':
      return groups.includes('proteina') && (groups.includes('vegetales') || groups.includes('fruta'))
        ? 'Para perder grasa, esta combinación visual de proteína y componentes frescos se ve razonable; vigila también porciones y frecuencia.'
        : 'Para perder grasa, ayudaría reforzar la proteína y sumar más vegetales visibles.';
    case 'strength':
      return groups.includes('proteina')
        ? 'Para fuerza, procura que la comida muestre proteína clara y energía suficiente para sostener el entrenamiento.'
        : 'Para fuerza, revisa si esta comida necesita una proteína más evidente y una base de energía más clara.';
    case 'mobility':
      return 'Para movilidad y bienestar, prioriza comidas sostenibles y fáciles de repetir con equilibrio visual.';
    default:
      return missing.length > 0
        ? `Como orientación general, podrías reforzar ${missing.join(', ')} para que el plato se vea más completo.`
        : 'Como orientación general, la lectura visual se ve bastante completa.';
  }
}

function buildGenericPracticalTip(groups: string[]) {
  if (groups.includes('proteina') && (groups.includes('vegetales') || groups.includes('fruta'))) {
    return 'Como lectura general, el plato ya muestra una base útil; revisa solo si la porción total se ajusta a tu objetivo.';
  }

  const missing = getMissingFoodGroups(groups);
  return missing.length > 0
    ? `Como lectura general, podrías reforzar ${missing.join(', ')} para que el plato se vea más completo.`
    : 'Como lectura general, el plato se ve bastante completo.';
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

  const signedUrl = await createVisionImageSignedUrlSafely(
    supabase,
    env.SUPABASE_MEAL_IMAGES_BUCKET,
    analysis.source_image_path,
  );

  return {
    ...analysis,
    source_image_url: signedUrl?.imageUrl ?? null,
    balance_assessment: buildBalanceAssessment(analysis.detected_food_groups),
    missing_components: getMissingFoodGroups(analysis.detected_food_groups),
    portion_estimate: buildPortionEstimate(analysis.detected_food_groups),
    protein_strength: analysis.protein_strength ?? buildProteinStrength(
      analysis.detected_tags,
      analysis.detected_food_groups,
    ),
    portion_detail: analysis.portion_detail ?? buildPortionDetail(
      analysis.detected_food_groups,
      analysis.detected_tags,
    ),
    practical_tip: buildGenericPracticalTip(analysis.detected_food_groups),
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
  const proteinStrength = buildProteinStrength(tags, detectedFoodGroups);
  const portionDetail = buildPortionDetail(detectedFoodGroups, tags);

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
    protein_strength: proteinStrength,
    portion_detail: portionDetail,
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
