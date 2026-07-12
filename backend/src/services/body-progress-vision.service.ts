import { randomUUID } from 'crypto';

import { env } from '../config/env';
import {
  analyzeImageTagsWithXimilar,
  detectPeopleWithXimilar,
} from '../integrations/ximilar/client';
import {
  createBodyProgressEntry,
  getBodyProgressEntryById,
  getBodyProgressEntryImagePathById,
  getLatestBodyProgressEntryByUserId,
  listBodyProgressEntriesByUserId,
  updateBodyProgressEntryComparison,
} from '../repositories/body-progress-vision.repository';
import { NotFoundError } from '../utils/api-response';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import type {
  BodyCategoryComparison,
  BodyCategoryKey,
  BodyCategoryTrend,
  BodyChangeLevel,
  BodyProgressEntry,
  BodyProgressEntryResponse,
  BodyProgressVisionTag,
  SamePersonCheck,
} from '../types/body-progress-vision.types';
import { compareBodyProgressWithVisionLLM } from '../lib/visionLlm';
import {
  buildVisionImageStoragePath,
  createVisionImageSignedUrlSafely,
  downloadVisionImageAsBase64,
  uploadVisionImage,
} from './visionImageStorage.service';
import {
  normalizeAndSortVisionTags,
  parseImageDataUrl,
} from './visionShared.service';
import type { AnalyzeBodyProgressInput } from '../validators/body-progress-vision.schemas';
import { logger } from '../lib/logger';

const NOISE_TAGS = new Set([
  'sexy', 'young', 'strong', 'strength', 'sport', 'beautiful',
  'attractive', 'model', 'healthy', 'athletic', 'active', 'fit',
  'handsome', 'pretty', 'cute', 'gorgeous', 'hot', 'slim',
  'thin', 'lean', 'toned', 'shapely', 'curvy', 'vector',
  'illustration', 'drawing', 'painting', 'sketch', 'art',
]);

function filterNoiseTags(tags: BodyProgressVisionTag[]): BodyProgressVisionTag[] {
  return tags.filter((tag) => !NOISE_TAGS.has(tag.name.toLowerCase()));
}

const BODY_FOCUS_RULES: Array<{ labels: string[]; output: string; minProb?: number }> = [
  { labels: ['person', 'man', 'woman'], output: 'persona principal' },
  { labels: ['bodybuilder', 'muscle', 'fitness'], output: 'contexto de entrenamiento avanzado', minProb: 0.85 },
  { labels: ['exercise', 'gym'], output: 'contexto de entrenamiento' },
  { labels: ['arm', 'shoulder', 'back', 'leg', 'chest', 'torso'], output: 'zonas corporales visibles' },
];

function pickOutputsFromRulesWithMinProb(
  tags: BodyProgressVisionTag[],
  rules: Array<{ labels: string[]; output: string; minProb?: number }>,
): string[] {
  const result: string[] = [];

  for (const rule of rules) {
    const matchingTags = tags.filter((tag) => {
      if (!rule.labels.includes(tag.name.toLowerCase())) return false;
      if (rule.minProb && tag.prob < rule.minProb) return false;
      return true;
    });

    if (matchingTags.length > 0) {
      result.push(rule.output);
    }
  }

  return [...new Set(result)];
}

const POSTURE_RULES: Array<{ labels: string[]; output: string }> = [
  { labels: ['front', 'frontal', 'standing', 'straight'], output: 'frontal' },
  { labels: ['side', 'lateral', 'profile'], output: 'lateral' },
  { labels: ['back', 'posterior', 'rear'], output: 'posterior' },
  { labels: ['flexing', 'pose'], output: 'pose' },
];

function buildPostureInferred(tags: BodyProgressVisionTag[]): string {
  const tagNames = tags.map((tag) => tag.name.toLowerCase());

  for (const rule of POSTURE_RULES) {
    if (rule.labels.some((label) => tagNames.includes(label))) {
      return rule.output;
    }
  }

  const hasSide = tagNames.some((name) => name.includes('side') || name.includes('lateral'));
  if (hasSide) {
    return 'lateral';
  }

  const hasFront = tagNames.some(
    (name) => name.includes('front') || name.includes('standing'),
  );
  if (hasFront) {
    return 'frontal';
  }

  return 'no determinada';
}

const BODY_ZONE_RULES: Array<{ labels: string[]; output: string }> = [
  { labels: ['chest', 'torso', 'pectoral', 'breast'], output: 'torso' },
  { labels: ['arm', 'bicep', 'shoulder', 'tricep', 'deltoid'], output: 'brazos' },
  { labels: ['leg', 'thigh', 'calf', 'quadricep'], output: 'piernas' },
  { labels: ['back', 'lat', 'trapezius', 'posterior'], output: 'espalda' },
  { labels: ['abdomen', 'abs', 'stomach', 'core', 'waist'], output: 'abdomen' },
  { labels: ['glute', 'buttock', 'hip'], output: 'gluteos' },
];

function buildVisibleBodyZones(tags: BodyProgressVisionTag[]): string[] {
  const tagNames = tags.map((tag) => tag.name.toLowerCase());
  const zones: string[] = [];

  for (const rule of BODY_ZONE_RULES) {
    if (rule.labels.some((label) => tagNames.includes(label))) {
      zones.push(rule.output);
    }
  }

  return [...new Set(zones)];
}

const CATEGORY_LABELS: Record<BodyCategoryKey, string> = {
  definicion_muscular: 'la definición muscular',
  volumen_muscular: 'el volumen muscular aparente',
  abdomen: 'el abdomen',
  brazos: 'los brazos',
  hombros: 'los hombros',
  pecho: 'el pecho',
  espalda: 'la espalda',
  piernas: 'las piernas',
  postura: 'la postura',
  simetria: 'la simetría corporal',
};

const PHYSICAL_CATEGORY_TAG_RULES: Record<
  Exclude<BodyCategoryKey, 'postura' | 'simetria'>,
  string[]
> = {
  definicion_muscular: ['definition', 'defined', 'vascular', 'ripped', 'shredded', 'toned', 'sixpack', 'lean', 'cut'],
  volumen_muscular: ['muscle', 'muscles', 'bodybuilder', 'bicep', 'biceps', 'bulk', 'mass', 'muscular', 'bulky'],
  abdomen: ['abs', 'abdomen', 'stomach', 'core', 'waist', 'sixpack', 'belly'],
  brazos: ['arm', 'bicep', 'biceps', 'tricep', 'triceps', 'forearm'],
  hombros: ['shoulder', 'shoulders', 'deltoid', 'deltoids'],
  pecho: ['chest', 'pectoral', 'pectorals', 'pecs', 'torso'],
  espalda: ['back', 'lat', 'lats', 'trapezius'],
  piernas: ['leg', 'legs', 'thigh', 'thighs', 'calf', 'calves', 'quadricep', 'quadriceps', 'hamstring'],
};

const PHYSICAL_CATEGORY_KEYS = Object.keys(PHYSICAL_CATEGORY_TAG_RULES) as Array<
  Exclude<BodyCategoryKey, 'postura' | 'simetria'>
>;

function computeCategorySignal(tags: BodyProgressVisionTag[], labels: string[]): number {
  return tags
    .filter((tag) => labels.includes(tag.name.toLowerCase()))
    .reduce((sum, tag) => sum + tag.prob, 0);
}

function trendFromDiff(diff: number): BodyCategoryTrend {
  if (diff >= 0.45) return 'incremento';
  if (diff >= 0.15) return 'incremento_leve';
  if (diff <= -0.45) return 'reduccion';
  if (diff <= -0.15) return 'reduccion_leve';
  return 'sin_cambio';
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function categoryNote(category: BodyCategoryKey, trend: BodyCategoryTrend): string {
  const label = CATEGORY_LABELS[category];

  switch (trend) {
    case 'incremento':
      return `Se aprecia un aumento visual notable en ${label} respecto al registro anterior.`;
    case 'incremento_leve':
      return `${capitalize(label)} muestra un ligero incremento visual respecto al registro anterior.`;
    case 'reduccion':
      return `Se aprecia una reducción visual notable en ${label} respecto al registro anterior.`;
    case 'reduccion_leve':
      return `Se aprecia una ligera reducción visual en ${label} respecto al registro anterior.`;
    case 'no_visible':
      return `${capitalize(label)} no se distingue con claridad en una o ambas fotos, asi que no se pudo comparar.`;
    case 'sin_cambio':
    default:
      return `No se aprecian cambios visuales claros en ${label}.`;
  }
}

function buildPhysicalCategoryComparison(
  currentTags: BodyProgressVisionTag[],
  previousTags: BodyProgressVisionTag[],
): Record<Exclude<BodyCategoryKey, 'postura' | 'simetria'>, BodyCategoryComparison> {
  const result = {} as Record<Exclude<BodyCategoryKey, 'postura' | 'simetria'>, BodyCategoryComparison>;

  for (const category of PHYSICAL_CATEGORY_KEYS) {
    const labels = PHYSICAL_CATEGORY_TAG_RULES[category];
    const currentSignal = computeCategorySignal(currentTags, labels);
    const previousSignal = computeCategorySignal(previousTags, labels);
    const visible = currentSignal > 0 && previousSignal > 0;

    const trend = visible ? trendFromDiff(currentSignal - previousSignal) : 'no_visible';

    result[category] = {
      visible,
      trend,
      note: categoryNote(category, trend),
    };
  }

  return result;
}

function comparePosture(currentPosture: string, previousPosture: string | undefined): BodyCategoryComparison {
  const prev = previousPosture ?? 'no determinada';

  if (currentPosture === 'no determinada' || prev === 'no determinada') {
    return {
      visible: false,
      trend: 'no_visible',
      note: 'El ángulo o postura no se distingue con claridad en una o ambas fotos.',
    };
  }

  if (currentPosture === prev) {
    return {
      visible: true,
      trend: 'sin_cambio',
      note: `El ángulo de la foto (${currentPosture}) es consistente con el registro anterior, lo que favorece la comparación.`,
    };
  }

  return {
    visible: true,
    trend: 'sin_cambio',
    note: `El ángulo de esta foto (${currentPosture}) difiere del registro anterior (${prev}); no es posible evaluar cambios de postura corporal (por ejemplo, más o menos erguida) de forma confiable solo con el etiquetado visual disponible.`,
  };
}

function buildSymmetryComparison(): BodyCategoryComparison {
  return {
    visible: false,
    trend: 'no_visible',
    note: 'La simetría corporal no se puede evaluar de forma confiable solo con el etiquetado visual genérico disponible; se necesitaría un análisis de pose mas detallado.',
  };
}

function buildCategoryComparison(
  currentTags: BodyProgressVisionTag[],
  currentPosture: string,
  previous: BodyProgressEntry,
): Record<BodyCategoryKey, BodyCategoryComparison> {
  const physical = buildPhysicalCategoryComparison(currentTags, previous.detected_tags);

  return {
    ...physical,
    postura: comparePosture(currentPosture, previous.posture_inferred),
    simetria: buildSymmetryComparison(),
  };
}

function buildOverallChangeLevel(
  categoryComparison: Record<BodyCategoryKey, BodyCategoryComparison>,
): BodyChangeLevel {
  const visibleTrends = PHYSICAL_CATEGORY_KEYS.map((key) => categoryComparison[key]).filter(
    (comparison) => comparison.visible,
  );

  if (visibleTrends.length === 0) {
    return 'leve';
  }

  const notableCount = visibleTrends.filter(
    (c) => c.trend === 'incremento' || c.trend === 'reduccion',
  ).length;
  const lightCount = visibleTrends.filter(
    (c) => c.trend === 'incremento_leve' || c.trend === 'reduccion_leve',
  ).length;

  if (notableCount >= 2) {
    return 'alto';
  }

  if (notableCount === 1 || lightCount >= 3) {
    return 'moderado';
  }

  return 'leve';
}

function buildObservations(categoryComparison: Record<BodyCategoryKey, BodyCategoryComparison>): string[] {
  const keysToReport: BodyCategoryKey[] = [...PHYSICAL_CATEGORY_KEYS, 'postura'];

  return keysToReport
    .map((key) => categoryComparison[key])
    .filter((c) => c.visible && c.trend !== 'sin_cambio')
    .map((c) => c.note);
}

function buildProgressSummary(
  isBaseline: boolean,
  changeLevel: BodyChangeLevel,
  categoryComparison: Record<BodyCategoryKey, BodyCategoryComparison>,
): string {
  if (isBaseline) {
    return 'Se creo tu punto de referencia inicial para el seguimiento visual corporal. A partir del proximo registro podras ver una comparacion aproximada de cambios.';
  }

  const changedLabels = PHYSICAL_CATEGORY_KEYS.filter((key) => {
    const c = categoryComparison[key];
    return c.visible && c.trend !== 'sin_cambio';
  }).map((key) => CATEGORY_LABELS[key]);

  if (changedLabels.length === 0) {
    return 'No se detectan cambios visuales relevantes respecto al registro anterior; el fisico se ve bastante consistente.';
  }

  return `Se detecta un nivel de cambio ${changeLevel} respecto al registro anterior, con variaciones visuales principalmente en ${changedLabels.join(', ')}.`;
}

function buildReliabilityWarning(
  currentTags: BodyProgressVisionTag[],
  currentPosture: string,
  previous: BodyProgressEntry | null,
): string | null {
  if (!previous) {
    return null;
  }

  const prevTagNames = new Set(previous.detected_tags.map((tag) => tag.name.toLowerCase()));
  const currentNames = currentTags.map((tag) => tag.name.toLowerCase());
  const overlap = currentNames.filter((name) => prevTagNames.has(name)).length;
  const ratio = currentNames.length > 0 ? overlap / currentNames.length : 0;

  const postureDiffers =
    previous.posture_inferred &&
    previous.posture_inferred !== 'no determinada' &&
    currentPosture !== 'no determinada' &&
    previous.posture_inferred !== currentPosture;

  if (ratio < 0.2 || postureDiffers) {
    return 'Las condiciones entre esta foto y la anterior parecen distintas (angulo, iluminacion, ropa o postura). La comparacion puede perder precision.';
  }

  if (ratio < 0.45) {
    return 'Hay algunas diferencias de encuadre o condiciones respecto a la foto anterior; la comparacion es aproximada.';
  }

  return null;
}

function buildSamePersonCheck(
  personDetectionAvailable: boolean,
  currentPersonCount: number,
  previousPersonCount: number,
): { check: SamePersonCheck; note: string } {
  if (currentPersonCount === 0) {
    return {
      check: 'sin_persona_detectada',
      note: 'No se detecto una persona con claridad en esta foto; no fue posible verificar nada respecto al registro anterior.',
    };
  }

  if (currentPersonCount > 1 || previousPersonCount > 1) {
    return {
      check: 'personas_multiples',
      note: 'Se detecto mas de una persona en alguna de las fotos; usa una foto individual para que la verificacion sea mas confiable.',
    };
  }

  if (!personDetectionAvailable) {
    return {
      check: 'no_disponible',
      note: 'La verificacion de identidad de Ximilar no esta disponible en este plan/cuenta; solo se confirma que hay una persona presente en la foto, no que sea biometricamente la misma persona.',
    };
  }

  return {
    check: 'consistente',
    note: 'Se detecto una persona en ambas fotos. Esta verificacion se basa en presencia de persona, no en reconocimiento facial biometrico (Ximilar no ofrece esa capacidad en este plan).',
  };
}

const NEXT_CAPTURE_RECOMMENDATIONS = [
  'Usa el mismo angulo y distancia de camara que en tu registro anterior.',
  'Repite ropa similar y ajustada, y un tipo de iluminacion parecido.',
  'Manten una postura relajada y natural, similar a la de tus fotos previas.',
];

const MEASUREMENT_DISCLAIMER =
  'Esta comparacion es unicamente una lectura visual aproximada y educativa. No calcula porcentaje de grasa corporal, masa muscular ni medidas fisicas reales, y no reemplaza una evaluacion profesional.';

async function detectPeopleWithFallback(base64Payload: string) {
  try {
    const result = await detectPeopleWithXimilar({ imageBase64: base64Payload });
    return { result, available: true };
  } catch (error) {
    logger.warn('Ximilar person detection unavailable. Falling back to generic tagging only.', {
      error,
    });

    return {
      result: {
        status: { code: 200, text: 'FALLBACK' },
        records: [{ _objects: [] }],
      },
      available: false,
    };
  }
}

async function enrichBodyProgressEntry(
  supabase: RequestSupabaseClient,
  entry: BodyProgressEntry | null,
): Promise<BodyProgressEntryResponse | null> {
  if (!entry) {
    return null;
  }

  const [signedUrl, comparedImagePath] = await Promise.all([
    createVisionImageSignedUrlSafely(
      supabase,
      env.SUPABASE_BODY_PROGRESS_IMAGES_BUCKET,
      entry.source_image_path,
    ),
    entry.compared_to_entry_id
      ? getBodyProgressEntryImagePathById(supabase, entry.compared_to_entry_id)
      : Promise.resolve(null),
  ]);

  const comparedSignedUrl = comparedImagePath
    ? await createVisionImageSignedUrlSafely(
        supabase,
        env.SUPABASE_BODY_PROGRESS_IMAGES_BUCKET,
        comparedImagePath,
      )
    : null;

  return {
    ...entry,
    source_image_url: signedUrl?.imageUrl ?? null,
    compared_to_image_url: comparedSignedUrl?.imageUrl ?? null,
  };
}

async function enrichBodyProgressEntries(
  supabase: RequestSupabaseClient,
  entries: BodyProgressEntry[],
) {
  return Promise.all(entries.map((entry) => enrichBodyProgressEntry(supabase, entry)));
}

export async function analyzeMyBodyProgress(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  input: AnalyzeBodyProgressInput,
) {
  const { contentType, extension, base64Payload, imageBuffer } = parseImageDataUrl(
    input.image_data_url,
  );
  const entryId = randomUUID();
  const storagePath = buildVisionImageStoragePath(
    'body-progress',
    auth.userId,
    entryId,
    extension,
  );
  const [taggingResult, personDetection, previousEntry] = await Promise.all([
    analyzeImageTagsWithXimilar({ imageBase64: base64Payload }),
    detectPeopleWithFallback(base64Payload),
    getLatestBodyProgressEntryByUserId(supabase, auth.userId),
  ]);

  const allTags = normalizeAndSortVisionTags(
    (taggingResult.records[0]?._tags ?? []).map((tag) => ({
      name: tag.name,
      prob: tag.prob,
    })),
  ) as BodyProgressVisionTag[];

  const tags = filterNoiseTags(allTags);
  const detectedPersonCount = (personDetection.result.records[0]?._objects ?? []).filter(
    (object) => object.name?.toLowerCase() === 'person',
  ).length;
  const inferredPersonCount =
    detectedPersonCount > 0
      ? detectedPersonCount
      : allTags.some((tag) => ['person', 'man', 'woman'].includes(tag.name.toLowerCase()))
        ? 1
        : 0;

  const bodyFocusTags = pickOutputsFromRulesWithMinProb(tags, BODY_FOCUS_RULES);
  const postureInferred = buildPostureInferred(tags);
  const visibleBodyZones = buildVisibleBodyZones(tags);
  const isBaseline = !previousEntry;

  const samePerson = previousEntry
    ? buildSamePersonCheck(personDetection.available, inferredPersonCount, previousEntry.person_count)
    : null;

  const shouldAttemptComparison =
    !!previousEntry && samePerson?.check !== 'sin_persona_detectada' && samePerson?.check !== 'personas_multiples';

  let categoryComparison: Record<BodyCategoryKey, BodyCategoryComparison> | null = null;
  let overallChangeLevel: BodyChangeLevel | null = null;
  let observations: string[] = [];
  let progressSummary: string;
  let reliabilityWarning: string | null = null;
  let comparisonMethod: 'vision_llm' | 'tag_heuristic' | null = null;

  if (shouldAttemptComparison && previousEntry) {
    const previousImage = await downloadVisionImageAsBase64(
      supabase,
      env.SUPABASE_BODY_PROGRESS_IMAGES_BUCKET,
      previousEntry.source_image_path,
    );

    const visionResult = previousImage
      ? await compareBodyProgressWithVisionLLM({
          previousImageBase64: previousImage.base64,
          previousContentType: previousImage.contentType,
          currentImageBase64: base64Payload,
          currentContentType: contentType,
        })
      : null;

    if (visionResult) {
      categoryComparison = visionResult.categories;
      overallChangeLevel = visionResult.overall_change_level;
      observations = visionResult.observations;
      progressSummary = visionResult.progress_summary;
      reliabilityWarning = visionResult.same_conditions ? null : visionResult.reliability_note;
      comparisonMethod = 'vision_llm';
    } else {
      categoryComparison = buildCategoryComparison(tags, postureInferred, previousEntry);
      overallChangeLevel = buildOverallChangeLevel(categoryComparison);
      observations = buildObservations(categoryComparison);
      progressSummary = buildProgressSummary(isBaseline, overallChangeLevel, categoryComparison);
      reliabilityWarning = buildReliabilityWarning(tags, postureInferred, previousEntry);
      comparisonMethod = 'tag_heuristic';
    }
  } else if (isBaseline) {
    progressSummary = buildProgressSummary(
      true,
      'leve',
      {} as Record<BodyCategoryKey, BodyCategoryComparison>,
    );
  } else {
    progressSummary =
      samePerson?.note ??
      'No fue posible comparar con el registro anterior; intenta una foto donde se distinga con claridad una sola persona.';
  }

  await uploadVisionImage(
    supabase,
    env.SUPABASE_BODY_PROGRESS_IMAGES_BUCKET,
    storagePath,
    imageBuffer,
    contentType,
  );

  const entry = await createBodyProgressEntry(supabase, {
    id: entryId,
    user_id: auth.userId,
    source_image_path: storagePath,
    source_image_content_type: contentType,
    ximilar_tagging_model: 'photo/tags/v2/tags',
    ximilar_person_model: 'identity/v2/person',
    detected_tags: tags,
    person_count: inferredPersonCount,
    body_focus_tags: bodyFocusTags,
    posture_inferred: postureInferred,
    visible_body_zones: visibleBodyZones,
    compared_to_entry_id: previousEntry?.id ?? null,
    is_baseline: isBaseline,
    same_person_check: samePerson?.check,
    same_person_note: samePerson?.note ?? null,
    category_comparison: categoryComparison,
    overall_change_level: overallChangeLevel,
    progress_summary: progressSummary,
    observations,
    reliability_warning: reliabilityWarning,
    next_capture_recommendations: NEXT_CAPTURE_RECOMMENDATIONS,
    measurement_disclaimer: MEASUREMENT_DISCLAIMER,
    comparison_method: comparisonMethod,
    ximilar_tagging_response: taggingResult,
    ximilar_person_response: personDetection.result,
  });

  return enrichBodyProgressEntry(supabase, entry);
}

export async function reanalyzeMyLatestBodyProgress(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
) {
  const latest = await getLatestBodyProgressEntryByUserId(supabase, auth.userId);

  if (!latest) {
    throw new NotFoundError('No tienes registros de progreso corporal todavia.');
  }

  if (!latest.compared_to_entry_id) {
    return enrichBodyProgressEntry(supabase, latest);
  }

  const previous = await getBodyProgressEntryById(supabase, latest.compared_to_entry_id);

  if (!previous) {
    return enrichBodyProgressEntry(supabase, latest);
  }

  const shouldAttemptComparison =
    latest.same_person_check !== 'sin_persona_detectada' &&
    latest.same_person_check !== 'personas_multiples';

  let categoryComparison: Record<BodyCategoryKey, BodyCategoryComparison> | null = null;
  let overallChangeLevel: BodyChangeLevel | null = null;
  let observations: string[] = [];
  let progressSummary: string;
  let reliabilityWarning: string | null = null;
  let comparisonMethod: 'vision_llm' | 'tag_heuristic' | null = null;

  if (shouldAttemptComparison) {
    const [currentImage, previousImage] = await Promise.all([
      downloadVisionImageAsBase64(supabase, env.SUPABASE_BODY_PROGRESS_IMAGES_BUCKET, latest.source_image_path),
      downloadVisionImageAsBase64(supabase, env.SUPABASE_BODY_PROGRESS_IMAGES_BUCKET, previous.source_image_path),
    ]);

    const visionResult =
      currentImage && previousImage
        ? await compareBodyProgressWithVisionLLM({
            previousImageBase64: previousImage.base64,
            previousContentType: previousImage.contentType,
            currentImageBase64: currentImage.base64,
            currentContentType: currentImage.contentType,
          })
        : null;

    if (visionResult) {
      categoryComparison = visionResult.categories;
      overallChangeLevel = visionResult.overall_change_level;
      observations = visionResult.observations;
      progressSummary = visionResult.progress_summary;
      reliabilityWarning = visionResult.same_conditions ? null : visionResult.reliability_note;
      comparisonMethod = 'vision_llm';
    } else {
      const currentPosture = latest.posture_inferred ?? 'no determinada';
      categoryComparison = buildCategoryComparison(latest.detected_tags, currentPosture, previous);
      overallChangeLevel = buildOverallChangeLevel(categoryComparison);
      observations = buildObservations(categoryComparison);
      progressSummary = buildProgressSummary(false, overallChangeLevel, categoryComparison);
      reliabilityWarning = buildReliabilityWarning(latest.detected_tags, currentPosture, previous);
      comparisonMethod = 'tag_heuristic';
    }
  } else {
    progressSummary =
      latest.same_person_note ??
      'No fue posible comparar con el registro anterior; intenta una foto donde se distinga con claridad una sola persona.';
  }

  const updated = await updateBodyProgressEntryComparison(supabase, latest.id, {
    category_comparison: categoryComparison,
    overall_change_level: overallChangeLevel,
    progress_summary: progressSummary,
    observations,
    reliability_warning: reliabilityWarning,
    comparison_method: comparisonMethod,
  });

  return enrichBodyProgressEntry(supabase, updated);
}

export async function getMyLatestBodyProgressEntry(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
) {
  try {
    const entry = await getLatestBodyProgressEntryByUserId(supabase, auth.userId);
    return await enrichBodyProgressEntry(supabase, entry);
  } catch (error) {
    logger.warn('Could not load latest body progress entry. Returning empty state instead.', {
      userId: auth.userId,
      error,
    });
    return null;
  }
}

export async function listMyBodyProgressEntries(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  limit = 6,
) {
  try {
    const entries = await listBodyProgressEntriesByUserId(supabase, auth.userId, limit);
    return await enrichBodyProgressEntries(supabase, entries);
  } catch (error) {
    logger.warn('Could not load body progress history. Returning empty state instead.', {
      userId: auth.userId,
      limit,
      error,
    });
    return [];
  }
}
