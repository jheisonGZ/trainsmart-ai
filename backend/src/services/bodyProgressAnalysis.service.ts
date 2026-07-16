import { randomUUID } from 'node:crypto';

import { env } from '../config/env';
import { analyzeImageWithPrompt } from '../lib/gemini-vision';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import {
  createBodyProgressAnalysis,
  deleteAllBodyProgressAnalyses,
  listBodyProgressAnalyses,
} from '../repositories/body-progress-analysis.repository';
import type { AuthUser } from '../types/auth.types';
import {
  buildImageStoragePath,
  createImageSignedUrl,
  removeImages,
  uploadImage,
} from './imageStorage.service';

const BODY_PROGRESS_PROMPT = [
  'Eres un asistente de fitness. Analiza esta foto de progreso corporal del usuario',
  'de forma objetiva, respetuosa y no clinica.',
  'Describe en 3-4 oraciones en espanol: postura visible, complexion general y',
  'cualquier observacion relevante para entrenamiento.',
  'No hagas diagnosticos medicos ni des un porcentaje exacto de grasa corporal,',
  'solo observaciones cualitativas generales.',
  'Responde solo con el texto de la descripcion, sin titulos ni markdown.',
].join(' ');

export async function analyzeAndSaveBodyProgressImage(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  image: Buffer,
  mimeType: string,
) {
  const analysisText = await analyzeImageWithPrompt(image, mimeType, BODY_PROGRESS_PROMPT);
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
