import { randomUUID } from 'crypto';

import { env } from '../config/env';
import {
  analyzeImageTagsWithXimilar,
  detectPeopleWithXimilar,
} from '../integrations/ximilar/client';
import {
  createBodyProgressEntry,
  getLatestBodyProgressEntryByUserId,
  listBodyProgressEntriesByUserId,
} from '../repositories/body-progress-vision.repository';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import type {
  BodyProgressEntry,
  BodyProgressEntryResponse,
  BodyProgressVisionTag,
} from '../types/body-progress-vision.types';
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
import type { AnalyzeBodyProgressInput } from '../validators/body-progress-vision.schemas';
import { logger } from '../lib/logger';

const NOISE_TAGS = new Set([
  'sexy', 'young', 'strong', 'strength', 'sport', 'beautiful',
  'attractive', 'model', 'healthy', 'athletic', 'active', 'fit',
  'handsome', 'pretty', 'cute', 'gorgeous', 'hot', 'slim',
  'thin', 'lean', 'toned', 'shapely', 'curvy', 'vector',
  'illustration', 'drawing', 'painting', 'sketch', 'art',
]);

const MUSCLE_SIGNALS = new Set([
  'muscle', 'muscles', 'bodybuilder', 'bicep', 'biceps',
  'abs', 'abdomen', 'sixpack', 'definition', 'defined',
  'toned', 'toned body', 'vascular', 'ripped', 'shredded',
  'deltoid', 'trapezius', 'lat', 'pectorals', 'chest',
  'shoulder', 'arm', 'tricep', 'quadricep', 'calves',
  'back', 'glutes', 'glute',
]);

const WEIGHT_SIGNALS = new Set([
  'fat', 'weight', 'overweight', 'obese', 'belly', 'big',
  'large', 'heavy', 'wide', 'round', 'stomach',
]);

const LEAN_SIGNALS = new Set([
  'lean', 'thin', 'slim', 'skinny', 'fit body', 'toned',
  'defined', 'vascular', 'shredded', 'ripped',
]);

interface BodySignals {
  muscle: number;
  weight: number;
  lean: number;
  total: number;
}

function computeBodySignals(tags: BodyProgressVisionTag[]): BodySignals {
  let muscle = 0;
  let weight = 0;
  let lean = 0;

  for (const tag of tags) {
    const name = tag.name.toLowerCase();
    if (MUSCLE_SIGNALS.has(name)) muscle += tag.prob;
    if (WEIGHT_SIGNALS.has(name)) weight += tag.prob;
    if (LEAN_SIGNALS.has(name)) lean += tag.prob;
  }

  const total = muscle + weight + lean;
  return { muscle, weight, lean, total };
}

function buildPhysicalTrend(
  currentSignals: BodySignals,
  previousEntry: BodyProgressEntry | null,
  currentTags: BodyProgressVisionTag[],
): string | null {
  if (!previousEntry) {
    return null;
  }

  const prevSignals = computeBodySignals(previousEntry.detected_tags);

  if (currentSignals.total < 0.3 && prevSignals.total < 0.3) {
    return 'Las señales corporales detectadas son débiles en ambas fotos; la comparación física es poco confiable con estas imágenes.';
  }

  if (currentSignals.total < 0.3) {
    return 'La foto actual no muestra señales corporales suficientes para evaluar cambios físicos con respecto a la anterior.';
  }

  if (prevSignals.total < 0.3) {
    return 'La foto anterior no tenía señales corporales claras; esta foto sirve como nueva referencia base.';
  }

  const currentBalance = currentSignals.muscle - currentSignals.weight;
  const prevBalance = prevSignals.muscle - prevSignals.weight;
  const diff = currentBalance - prevBalance;

  if (diff > 0.5) {
    return 'Señal de mejora física: se detectan más señales de tono muscular y menos señales de peso en comparación con la foto anterior.';
  }

  if (diff < -0.5) {
    return 'Señal de cambio físico: se detectan más señales de peso y menos tono muscular en comparación con la foto anterior.';
  }

  if (Math.abs(diff) <= 0.2) {
    return 'Las señales físicas son bastante similares a la foto anterior; no se aprecia un cambio significativo en esta comparación visual.';
  }

  return 'Hay cambios leves en las señales físicas detectadas, pero la diferencia no es lo suficientemente clara como para sacar conclusiones.';
}

function buildBodyReadingFromSignals(
  personCount: number,
  signals: BodySignals,
  bodyFocusTags: string[],
  previous: BodyProgressEntry | null,
) {
  if (personCount === 0) {
    return 'No se puede hacer una lectura corporal confiable con esta foto.';
  }

  if (personCount > 1) {
    return 'Hay más de una persona en la imagen, así que la lectura corporal queda limitada.';
  }

  const parts: string[] = [];

  if (signals.muscle > 0.6) {
    parts.push('Se detectan señales claras de tono y definición muscular.');
  } else if (signals.muscle > 0.3) {
    parts.push('Se detectan algunas señales de tono muscular.');
  }

  if (signals.weight > 0.6) {
    parts.push('Se detectan señales predominantes de peso corporal elevado.');
  } else if (signals.weight > 0.3) {
    parts.push('Se detectan algunas señales de peso corporal.');
  }

  if (signals.lean > 0.3) {
    parts.push('Se detectan señales de complexión delgada o definida.');
  }

  if (bodyFocusTags.includes('zonas corporales visibles')) {
    parts.push('Las zonas corporales son lo suficientemente visibles para servir como referencia de seguimiento.');
  }

  if (parts.length === 0) {
    return previous
      ? 'Las señales corporales en esta foto son poco específicas. Para mejores lecturas, intenta una foto con mejor iluminación y el cuerpo más visible.'
      : 'Las señales corporales son poco específicas; la foto funciona como referencia base, pero fotos con mejor iluminación y encuadre darán mejores lecturas.';
  }

  return parts.join(' ');
}

const BODY_FOCUS_RULES: Array<{ labels: string[]; output: string; minProb?: number }> = [
  { labels: ['person', 'man', 'woman'], output: 'persona principal' },
  { labels: ['bodybuilder', 'muscle', 'fitness'], output: 'contexto de entrenamiento avanzado', minProb: 0.85 },
  { labels: ['exercise', 'gym'], output: 'contexto de entrenamiento' },
  { labels: ['arm', 'shoulder', 'back', 'leg', 'chest', 'torso'], output: 'zonas corporales visibles' },
];

const POSTURE_RULES: Array<{ labels: string[]; output: string }> = [
  { labels: ['front', 'frontal', 'standing', 'straight'], output: 'frontal' },
  { labels: ['side', 'lateral', 'profile'], output: 'lateral' },
  { labels: ['back', 'posterior', 'rear'], output: 'posterior' },
  { labels: ['flexing', 'pose'], output: 'pose' },
];

const BODY_ZONE_RULES: Array<{ labels: string[]; output: string }> = [
  { labels: ['chest', 'torso', 'pectoral', 'breast'], output: 'torso' },
  { labels: ['arm', 'bicep', 'shoulder', 'tricep', 'deltoid'], output: 'brazos' },
  { labels: ['leg', 'thigh', 'calf', 'quadricep'], output: 'piernas' },
  { labels: ['back', 'lat', 'trapezius', 'posterior'], output: 'espalda' },
  { labels: ['abdomen', 'abs', 'stomach', 'core', 'waist'], output: 'abdomen' },
  { labels: ['glute', 'buttock', 'hip'], output: 'gluteos' },
];

function filterNoiseTags(tags: BodyProgressVisionTag[]): BodyProgressVisionTag[] {
  return tags.filter((tag) => !NOISE_TAGS.has(tag.name.toLowerCase()));
}

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

function buildQualityWarnings(personCount: number, topTags: string[], previousExists: boolean) {
  const warnings: string[] = [];

  if (personCount === 0) {
    warnings.push('No se detecto una persona con claridad; la comparacion visual puede ser poco confiable.');
  }

  if (personCount > 1) {
    warnings.push('Se detectaron varias personas; intenta usar una foto individual para mejorar el seguimiento.');
  }

  const hasPersonTag = topTags.some((tag) =>
    ['person', 'man', 'woman'].includes(tag.toLowerCase()),
  );
  if (!hasPersonTag) {
    warnings.push('El encuadre no resalta claramente el cuerpo completo o principal.');
  }

  if (!previousExists) {
    warnings.push('Este es tu primer registro visual; aun no existe una referencia anterior para comparar.');
  }

  return warnings;
}

function buildEntrySummary(personCount: number, bodyFocusTags: string[], topTags: string[]) {
  const personText =
    personCount > 0
      ? `Se detecta ${personCount === 1 ? 'una persona principal' : `${personCount} personas`}.`
      : 'No se detecta una persona con claridad.';

  const focusText =
    bodyFocusTags.length > 0
      ? `El registro resalta ${bodyFocusTags.join(', ')}.`
      : 'El registro no aporta suficientes senales corporales especificas.';

  const relevantTags = filterNoiseTags(topTags.map((name) => ({ name, prob: 1 }))).map((t) => t.name);
  const tagsText = relevantTags.length > 0
    ? `Referencias visuales: ${relevantTags.join(', ')}.`
    : '';

  return `${personText} ${focusText} ${tagsText}`.trim();
}

function buildCaptureQuality(
  personCount: number,
  bodyFocusTags: string[],
  previousExists: boolean,
) {
  if (personCount === 0) {
    return 'Calidad baja: no se distingue una persona con claridad.';
  }

  if (personCount > 1) {
    return 'Calidad limitada: aparecen varias personas y la comparacion pierde precision.';
  }

  if (bodyFocusTags.length === 0) {
    return previousExists
      ? 'Calidad aceptable, pero la lectura sigue siendo bastante general.'
      : 'Calidad aceptable como primer punto de partida.';
  }

  if (bodyFocusTags.includes('zonas corporales visibles')) {
    return 'Calidad buena: se distinguen zonas del cuerpo que facilitan el seguimiento visual.';
  }

  return 'Calidad razonable: sirve como referencia visual aproximada.';
}

function buildNextCaptureTip(
  personCount: number,
  bodyFocusTags: string[],
  previousExists: boolean,
) {
  if (personCount === 0) {
    return 'Intenta una foto frontal, con el cuerpo completo, mejor luz y sin objetos que tapen el torso.';
  }

  if (personCount > 1) {
    return 'Usa una foto individual para que la comparacion sea mas precisa.';
  }

  if (!previousExists) {
    return 'Esta foto quedara como referencia inicial; procura repetir angulo, distancia y ropa en el siguiente registro.';
  }

  if (bodyFocusTags.length === 0) {
    return 'Para comparar mejor, repite la misma postura, angulo y distancia en la proxima foto.';
  }

  return 'Mantén el mismo angulo, luz, distancia y postura para que la siguiente comparacion sea mas consistente.';
}

function buildComparisonSummary(
  currentTags: BodyProgressVisionTag[],
  previous: BodyProgressEntry | null,
  currentBodyFocusTags: string[],
) {
  if (!previous) {
    return 'Se creo un punto de partida visual. Las siguientes fotos permitiran una comparacion aproximada de cambios.';
  }

  const prevTagNames = new Set(previous.detected_tags.map((tag) => tag.name.toLowerCase()));
  const currentTagNames = currentTags.map((tag) => tag.name.toLowerCase());
  const overlapCount = currentTagNames.filter((tag) => prevTagNames.has(tag)).length;
  const overlapRatio =
    currentTagNames.length > 0 ? overlapCount / currentTagNames.length : 0;

  if (overlapRatio >= 0.5) {
    return 'El encuadre visual parece relativamente consistente con el registro anterior. La comparacion es util como seguimiento aproximado, no clinico.';
  }

  if (overlapRatio < 0.2) {
    return 'La comparacion con el registro anterior es limitada; los encuadres o condiciones son muy diferentes. Intenta repetir la misma postura y angulo.';
  }

  return 'La comparacion con el registro anterior esta parcialmente limitada por diferencias en encuadre, postura o iluminacion.';
}

function buildComparisonNotes(qualityWarnings: string[]) {
  if (qualityWarnings.length === 0) {
    return 'Mantén mismo angulo, iluminacion y distancia para que la siguiente comparacion sea mas estable.';
  }

  return `${qualityWarnings.join(' ')} Procura repetir angulo, postura, ropa e iluminacion en el proximo registro.`;
}

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

function buildChangeSummary(
  currentBodyFocusTags: string[],
  previous: BodyProgressEntry | null,
  currentTags: BodyProgressVisionTag[],
  currentSignals: BodySignals,
): string | null {
  if (!previous) {
    return null;
  }

  const physicalTrend = buildPhysicalTrend(currentSignals, previous, currentTags);

  const prevFocusSet = new Set(previous.body_focus_tags);
  const newFocusTags = currentBodyFocusTags.filter((tag) => !prevFocusSet.has(tag));
  const lostFocusTags = previous.body_focus_tags.filter(
    (tag) => !currentBodyFocusTags.includes(tag),
  );

  const prevTagNames = new Set(previous.detected_tags.map((t) => t.name.toLowerCase()));
  const currentFiltered = filterNoiseTags(currentTags);
  const newVisualTags = currentFiltered
    .map((t) => t.name.toLowerCase())
    .filter((name) => !prevTagNames.has(name));
  const lostVisualTags = [...prevTagNames]
    .filter((name) => !NOISE_TAGS.has(name))
    .filter((name) => !currentTags.some((t) => t.name.toLowerCase() === name));

  const notes: string[] = [];

  if (physicalTrend) {
    notes.push(physicalTrend);
  }

  if (newFocusTags.length > 0) {
    notes.push(`Cambios en señales detectadas: ${newFocusTags.join(', ')}`);
  }

  if (lostFocusTags.length > 0) {
    notes.push(`Señales que ya no aparecen: ${lostFocusTags.join(', ')}`);
  }

  if (newVisualTags.length > 0) {
    notes.push(`Nuevas referencias visuales: ${newVisualTags.slice(0, 3).join(', ')}`);
  }

  if (lostVisualTags.length > 0) {
    notes.push(`Referencias previas que ya no aparecen: ${lostVisualTags.slice(0, 3).join(', ')}`);
  }

  if (notes.length === 0) {
    return 'La imagen es bastante consistente con el registro anterior; los cambios visuales son minimos.';
  }

  return notes.join('. ') + '. Ten en cuenta que esta comparacion es aproximada y no clinica.';
}

async function detectPeopleWithFallback(base64Payload: string) {
  try {
    return await detectPeopleWithXimilar({ imageBase64: base64Payload });
  } catch (error) {
    logger.warn('Ximilar person detection unavailable. Falling back to generic tagging only.', {
      error,
    });

    return {
      status: { code: 200, text: 'FALLBACK' },
      records: [{ _objects: [] }],
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

  const signedUrl = await createVisionImageSignedUrlSafely(
    supabase,
    env.SUPABASE_BODY_PROGRESS_IMAGES_BUCKET,
    entry.source_image_path,
  );

  return {
    ...entry,
    source_image_url: signedUrl?.imageUrl ?? null,
    posture_inferred: entry.posture_inferred ?? buildPostureInferred(entry.detected_tags),
    visible_body_zones: entry.visible_body_zones?.length
      ? entry.visible_body_zones
      : buildVisibleBodyZones(entry.detected_tags),
    capture_quality: buildCaptureQuality(
      entry.person_count,
      entry.body_focus_tags,
      Boolean(entry.compared_to_entry_id),
    ),
    body_reading: buildBodyReadingFromSignals(
      entry.person_count,
      computeBodySignals(entry.detected_tags),
      entry.body_focus_tags,
      null,
    ),
    next_capture_tip: buildNextCaptureTip(
      entry.person_count,
      entry.body_focus_tags,
      Boolean(entry.compared_to_entry_id),
    ),
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
  const [taggingResult, personResult, previousEntry] = await Promise.all([
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
  const personCount = (personResult.records[0]?._objects ?? []).filter(
    (object) => object.name?.toLowerCase() === 'person',
  ).length;
  const inferredPersonCount =
    personCount > 0
      ? personCount
      : allTags.some((tag) => ['person', 'man', 'woman'].includes(tag.name.toLowerCase()))
        ? 1
        : 0;
  const bodyFocusTags = pickOutputsFromRulesWithMinProb(tags, BODY_FOCUS_RULES);
  const topTags = getTopTagNames(tags);
  const postureInferred = buildPostureInferred(tags);
  const visibleBodyZones = buildVisibleBodyZones(tags);
  const currentSignals = computeBodySignals(tags);
  const qualityWarnings = buildQualityWarnings(
    inferredPersonCount,
    topTags,
    Boolean(previousEntry),
  );
  if (personCount === 0) {
    qualityWarnings.push(
      'La deteccion especifica de persona no estuvo disponible en Ximilar para esta cuenta; se uso una inferencia visual de respaldo.',
    );
  }
  const entrySummary = buildEntrySummary(inferredPersonCount, bodyFocusTags, topTags);
  const comparisonSummary = buildComparisonSummary(tags, previousEntry, bodyFocusTags);
  const comparisonNotes = buildComparisonNotes(qualityWarnings);
  const changeSummary = buildChangeSummary(bodyFocusTags, previousEntry, tags, currentSignals);

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
    quality_warnings: qualityWarnings,
    body_focus_tags: bodyFocusTags,
    entry_summary: entrySummary,
    posture_inferred: postureInferred,
    visible_body_zones: visibleBodyZones,
    comparison_summary: comparisonSummary,
    comparison_notes: comparisonNotes,
    compared_to_entry_id: previousEntry?.id ?? null,
    ximilar_tagging_response: taggingResult,
    ximilar_person_response: personResult,
  });

  const enriched = await enrichBodyProgressEntry(supabase, entry);

  if (enriched) {
    enriched.body_reading = buildBodyReadingFromSignals(
      enriched.person_count,
      computeBodySignals(enriched.detected_tags),
      enriched.body_focus_tags,
      previousEntry,
    );
    enriched.capture_quality = buildCaptureQuality(
      enriched.person_count,
      enriched.body_focus_tags,
      Boolean(previousEntry),
    );
    enriched.posture_inferred = enriched.posture_inferred ?? buildPostureInferred(enriched.detected_tags);
    enriched.visible_body_zones = enriched.visible_body_zones?.length
      ? enriched.visible_body_zones
      : buildVisibleBodyZones(enriched.detected_tags);
    enriched.change_summary = changeSummary;
    enriched.next_capture_tip = buildNextCaptureTip(
      enriched.person_count,
      enriched.body_focus_tags,
      Boolean(previousEntry),
    );
  }

  return enriched;
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
