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

const BODY_FOCUS_RULES: Array<{ labels: string[]; output: string }> = [
  { labels: ['person', 'man', 'woman'], output: 'persona visible' },
  { labels: ['bodybuilder', 'muscle', 'fitness'], output: 'masa muscular visible' },
  { labels: ['exercise', 'gym'], output: 'contexto de entrenamiento' },
  { labels: ['arm', 'shoulder', 'back', 'leg', 'chest', 'torso'], output: 'zonas corporales marcadas' },
];

function buildQualityWarnings(personCount: number, topTags: string[], previousExists: boolean) {
  const warnings: string[] = [];

  if (personCount === 0) {
    warnings.push('No se detecto una persona con claridad; la comparacion visual puede ser poco confiable.');
  }

  if (personCount > 1) {
    warnings.push('Se detectaron varias personas; intenta usar una foto individual para mejorar el seguimiento.');
  }

  if (!topTags.some((tag) => ['person', 'man', 'woman', 'bodybuilder', 'fitness'].includes(tag.toLowerCase()))) {
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
      : 'El registro no aporta suficientes señales corporales especificas.';
  const tagsText =
    topTags.length > 0 ? `Tags visuales principales: ${topTags.join(', ')}.` : '';

  return `${personText} ${focusText} ${tagsText}`.trim();
}

function buildComparisonSummary(
  currentTags: BodyProgressVisionTag[],
  previous: BodyProgressEntry | null,
  currentBodyFocusTags: string[],
) {
  if (!previous) {
    return 'Se creo un punto de partida visual. Las siguientes fotos permitiran una comparacion aproximada de cambios de postura, definicion o consistencia.';
  }

  const previousTagNames = new Set(previous.detected_tags.map((tag) => tag.name.toLowerCase()));
  const currentTagNames = currentTags.map((tag) => tag.name.toLowerCase());
  const overlapCount = currentTagNames.filter((tag) => previousTagNames.has(tag)).length;
  const overlapRatio =
    currentTagNames.length > 0 ? overlapCount / currentTagNames.length : 0;

  if (overlapRatio >= 0.5) {
    return 'El encuadre visual parece relativamente consistente con el registro anterior. La comparacion es util como seguimiento aproximado, no clinico.';
  }

  if (currentBodyFocusTags.includes('masa muscular visible')) {
    return 'El registro actual resalta mas definicion visual o zonas musculares marcadas que pueden servir como comparacion aproximada con la foto anterior.';
  }

  return 'La comparacion con el registro anterior esta limitada por cambios de encuadre, postura o iluminacion.';
}

function buildComparisonNotes(qualityWarnings: string[]) {
  if (qualityWarnings.length === 0) {
    return 'Mantén mismo angulo, iluminacion y distancia para que la siguiente comparacion sea mas estable.';
  }

  return `${qualityWarnings.join(' ')} Procura repetir angulo, postura, ropa e iluminacion en el proximo registro.`;
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

  const tags = normalizeAndSortVisionTags(
    (taggingResult.records[0]?._tags ?? []).map((tag) => ({
      name: tag.name,
      prob: tag.prob,
    })),
  ) as BodyProgressVisionTag[];
  const personCount = (personResult.records[0]?._objects ?? []).filter(
    (object) => object.name.toLowerCase() === 'person',
  ).length;
  const inferredPersonCount =
    personCount > 0
      ? personCount
      : tags.some((tag) => ['person', 'man', 'woman', 'bodybuilder'].includes(tag.name.toLowerCase()))
        ? 1
        : 0;
  const bodyFocusTags = pickOutputsFromRules(tags, BODY_FOCUS_RULES);
  const topTags = getTopTagNames(tags);
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
    comparison_summary: comparisonSummary,
    comparison_notes: comparisonNotes,
    compared_to_entry_id: previousEntry?.id ?? null,
    ximilar_tagging_response: taggingResult,
    ximilar_person_response: personResult,
  });

  return enrichBodyProgressEntry(supabase, entry);
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
