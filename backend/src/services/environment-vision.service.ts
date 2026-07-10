import { randomUUID } from 'crypto';

import { env } from '../config/env';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import { logger } from '../lib/logger';
import type { AuthUser } from '../types/auth.types';
import type {
  EnvironmentAnalysisResponse,
  EnvironmentVisionTag,
} from '../types/environment-vision.types';
import {
  deleteEnvironmentAnalysesByUserId,
  createEnvironmentAnalysis,
  listEnvironmentAnalysesByUserId,
  getLatestEnvironmentAnalysisByUserId,
  updateEnvironmentAnalysis,
} from '../repositories/environment-vision.repository';
import { analyzeImageTagsWithXimilar } from '../integrations/ximilar/client';
import {
  buildVisionImageStoragePath,
  deleteVisionImage,
  createVisionImageSignedUrlSafely,
  uploadVisionImage,
} from './visionImageStorage.service';
import {
  normalizeAndSortVisionTags,
  parseImageDataUrl,
  pickOutputsFromRules,
} from './visionShared.service';
import type { AnalyzeEnvironmentInput } from '../validators/environment-vision.schemas';

const EQUIPMENT_RULES: Array<{ labels: string[]; output: string }> = [
  { labels: ['dumbbell', 'dumbbells', 'weight'], output: 'mancuernas' },
  { labels: ['barbell'], output: 'barra' },
  { labels: ['kettlebell'], output: 'kettlebell' },
  { labels: ['chair', 'stool'], output: 'silla' },
  { labels: ['bench'], output: 'banco' },
  { labels: ['mat', 'yoga mat', 'exercise mat'], output: 'colchoneta' },
  { labels: ['resistance band', 'elastic band', 'rubber band'], output: 'bandas elasticas' },
  { labels: ['bicycle', 'exercise bike'], output: 'bicicleta' },
  { labels: ['stairs', 'staircase'], output: 'escaleras' },
  { labels: ['wall'], output: 'pared' },
];

const SPACE_RULES: Array<{ labels: string[]; output: string }> = [
  { labels: ['indoor', 'room', 'home', 'apartment'], output: 'interior' },
  { labels: ['outdoor', 'park', 'grass'], output: 'exterior' },
  { labels: ['floor'], output: 'trabajo en suelo posible' },
  { labels: ['garage'], output: 'espacio funcional tipo garaje' },
];

function buildEnvironmentSummary(equipment: string[], spaceTags: string[]) {
  const equipmentText =
    equipment.length > 0 ? equipment.join(', ') : 'sin equipamiento claramente identificable';
  const spaceText =
    spaceTags.length > 0 ? spaceTags.join(', ') : 'sin contexto espacial concluyente';

  return `Se detecta ${equipmentText}. El entorno parece ${spaceText}.`;
}

function buildTrainingContext(equipment: string[], spaceTags: string[]) {
  const lines = [
    equipment.length > 0
      ? `Equipo visible confirmado: ${equipment.join(', ')}.`
      : 'No se confirmo equipamiento especifico; prioriza peso corporal y apoyos basicos.',
    spaceTags.length > 0
      ? `Contexto espacial detectado: ${spaceTags.join(', ')}.`
      : 'No asumas un gimnasio completo ni maquinas no visibles.',
    'Adapta la rutina solo a implementos visibles o a variantes de peso corporal.',
    'Evita proponer maquinas, barras olimpicas o accesorios no detectados en la imagen.',
  ];

  return lines.join(' ');
}

function buildSpaceDescription(spaceTags: string[]) {
  if (spaceTags.length > 0) {
    return `El espacio parece ${spaceTags.join(', ')}.`;
  }

  return 'No se pudo identificar con claridad el tipo de espacio disponible.';
}

function buildEquipmentDescription(equipment: string[]) {
  if (equipment.length > 0) {
    return `Equipo visible detectado: ${equipment.join(', ')}.`;
  }

  return 'No se detecto equipamiento claro; la rutina deberia apoyarse en peso corporal y apoyos basicos.';
}

async function enrichEnvironmentAnalysis(
  supabase: RequestSupabaseClient,
  analysis: Awaited<ReturnType<typeof getLatestEnvironmentAnalysisByUserId>>,
): Promise<EnvironmentAnalysisResponse | null> {
  if (!analysis) {
    return null;
  }

  const signedUrl = await createVisionImageSignedUrlSafely(
    supabase,
    env.SUPABASE_ENVIRONMENT_IMAGES_BUCKET,
    analysis.source_image_path,
  );

  return {
    ...analysis,
    source_image_url: signedUrl?.imageUrl ?? null,
    space_description: buildSpaceDescription(analysis.detected_space_tags),
    equipment_description: buildEquipmentDescription(analysis.detected_equipment),
  };
}

async function clearEnvironmentAnalyses(
  supabase: RequestSupabaseClient,
  userId: string,
) {
  const existingAnalyses = await listEnvironmentAnalysesByUserId(supabase, userId);

  for (const analysis of existingAnalyses) {
    await deleteVisionImage(
      supabase,
      env.SUPABASE_ENVIRONMENT_IMAGES_BUCKET,
      analysis.source_image_path,
    );
  }

  if (existingAnalyses.length > 0) {
    await deleteEnvironmentAnalysesByUserId(supabase, userId);
  }
}

export async function analyzeMyEnvironment(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  input: AnalyzeEnvironmentInput,
) {
  const { contentType, extension, base64Payload, imageBuffer } = parseImageDataUrl(
    input.image_data_url,
  );
  const existingAnalysis = await getLatestEnvironmentAnalysisByUserId(supabase, auth.userId);
  const analysisId = existingAnalysis?.id ?? randomUUID();
  const storagePath =
    existingAnalysis?.source_image_path ??
    buildVisionImageStoragePath('environment', auth.userId, analysisId, extension);

  const ximilarResult = await analyzeImageTagsWithXimilar({
    imageBase64: base64Payload,
  });

  const tags = normalizeAndSortVisionTags(
    (ximilarResult.records[0]?._tags ?? []).map((tag) => ({
      name: tag.name,
      prob: tag.prob,
    })),
  ) as EnvironmentVisionTag[];

  const detectedEquipment = Array.from(new Set(pickOutputsFromRules(tags, EQUIPMENT_RULES)));
  const detectedSpaceTags = Array.from(new Set(pickOutputsFromRules(tags, SPACE_RULES)));
  const summary = buildEnvironmentSummary(detectedEquipment, detectedSpaceTags);
  const trainingContext = buildTrainingContext(detectedEquipment, detectedSpaceTags);

  await uploadVisionImage(
    supabase,
    env.SUPABASE_ENVIRONMENT_IMAGES_BUCKET,
    storagePath,
    imageBuffer,
    contentType,
  );

  const analysis = existingAnalysis
    ? await updateEnvironmentAnalysis(supabase, analysisId, {
        source_image_path: storagePath,
        source_image_content_type: contentType,
        ximilar_model: 'photo/tags/v2/tags',
        detected_tags: tags,
        detected_equipment: detectedEquipment,
        detected_space_tags: detectedSpaceTags,
        summary,
        training_context: trainingContext,
        ximilar_response: ximilarResult,
      })
    : await createEnvironmentAnalysis(supabase, {
        id: analysisId,
        user_id: auth.userId,
        source_image_path: storagePath,
        source_image_content_type: contentType,
        ximilar_model: 'photo/tags/v2/tags',
        detected_tags: tags,
        detected_equipment: detectedEquipment,
        detected_space_tags: detectedSpaceTags,
        summary,
        training_context: trainingContext,
        ximilar_response: ximilarResult,
      });

  return enrichEnvironmentAnalysis(supabase, analysis);
}

export async function clearMyEnvironmentAnalysis(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
) {
  await clearEnvironmentAnalyses(supabase, auth.userId);
}

export async function getMyLatestEnvironmentAnalysis(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
) {
  try {
    const analysis = await getLatestEnvironmentAnalysisByUserId(supabase, auth.userId);
    return await enrichEnvironmentAnalysis(supabase, analysis);
  } catch (error) {
    logger.warn('Could not load latest environment analysis. Returning empty state instead.', {
      userId: auth.userId,
      error,
    });
    return null;
  }
}

export async function getEnvironmentContextSnapshot(
  supabase: RequestSupabaseClient,
  userId: string,
) {
  const analysis = await getLatestEnvironmentAnalysisByUserId(supabase, userId);

  if (!analysis) {
    return null;
  }

  return {
    summary: analysis.summary,
    space_description: buildSpaceDescription(analysis.detected_space_tags),
    equipment_description: buildEquipmentDescription(analysis.detected_equipment),
    training_context: analysis.training_context,
    created_at: analysis.created_at,
  };
}
