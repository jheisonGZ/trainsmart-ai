import { randomUUID } from 'node:crypto';

import { elevenLabsConfig } from '../config/elevenlabs';
import { generateSpeechFromText } from '../lib/elevenlabs';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import {
  getBodyProgressAnalysisById,
} from '../repositories/body-progress-analysis.repository';
import {
  getEnvironmentAnalysisById,
} from '../repositories/environment-analysis.repository';
import { getMealAnalysisById } from '../repositories/meal-analysis.repository';
import type { AuthUser } from '../types/auth.types';
import type { BodyProgressAnalysis } from '../types/body-progress-analysis.types';
import type { EnvironmentAnalysis } from '../types/environment-analysis.types';
import type { MealAnalysis } from '../types/meal-analysis.types';
import { PreconditionFailedError } from '../utils/api-response';
import { createRoutineAudioSignedUrl, uploadRoutineAudio } from './audioStorage.service';

function ensureElevenLabsEnabled() {
  if (!elevenLabsConfig.enabled) {
    throw new PreconditionFailedError('ElevenLabs text-to-speech is disabled.');
  }
}

function formatQuantity(value: number | null, unit: string) {
  return typeof value === 'number' ? `${Math.round(value)} ${unit}` : null;
}

function buildMealNarrationText(record: MealAnalysis) {
  const foods = record.food_names.length > 0
    ? record.food_names.join(', ')
    : 'alimentos que no pude identificar con claridad';

  const parts = [`Detecte lo siguiente en tu plato: ${foods}.`];

  const macros = [
    formatQuantity(record.calories, 'calorias'),
    formatQuantity(record.protein_g, 'gramos de proteina'),
    formatQuantity(record.carbs_g, 'gramos de carbohidratos'),
    formatQuantity(record.fat_g, 'gramos de grasa'),
  ].filter((value): value is string => Boolean(value));

  if (macros.length > 0) {
    parts.push(`Aproximadamente ${macros.join(', ')}.`);
  }

  return parts.join(' ');
}

function buildBodyProgressNarrationText(record: BodyProgressAnalysis) {
  return record.analysis_text?.trim() || 'No hay observaciones disponibles para esta foto.';
}

function buildEnvironmentNarrationText(record: EnvironmentAnalysis) {
  const equipmentIntro = record.equipment_detected.length > 0
    ? `Equipo detectado: ${record.equipment_detected.join(', ')}. `
    : '';

  const text = `${equipmentIntro}${record.analysis_text?.trim() ?? ''}`.trim();

  return text.length > 0 ? text : 'No hay observaciones disponibles para este entorno.';
}

async function synthesizeAndStore(
  supabase: RequestSupabaseClient,
  userId: string,
  analysisId: string,
  text: string,
) {
  const audio = await generateSpeechFromText({
    text,
    voiceId: elevenLabsConfig.voiceId,
    modelId: elevenLabsConfig.modelId,
    outputFormat: elevenLabsConfig.outputFormat,
  });

  const path = `analysis-audio/${userId}/${analysisId}-${randomUUID()}.mp3`;
  await uploadRoutineAudio(supabase, path, audio);
  return createRoutineAudioSignedUrl(supabase, path);
}

export async function generateMealAnalysisNarration(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  analysisId: string,
) {
  ensureElevenLabsEnabled();
  const record = await getMealAnalysisById(supabase, analysisId, auth.userId);
  const text = buildMealNarrationText(record);
  return synthesizeAndStore(supabase, auth.userId, record.id, text);
}

export async function generateBodyProgressAnalysisNarration(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  analysisId: string,
) {
  ensureElevenLabsEnabled();
  const record = await getBodyProgressAnalysisById(supabase, analysisId, auth.userId);
  const text = buildBodyProgressNarrationText(record);
  return synthesizeAndStore(supabase, auth.userId, record.id, text);
}

export async function generateEnvironmentAnalysisNarration(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  analysisId: string,
) {
  ensureElevenLabsEnabled();
  const record = await getEnvironmentAnalysisById(supabase, analysisId, auth.userId);
  const text = buildEnvironmentNarrationText(record);
  return synthesizeAndStore(supabase, auth.userId, record.id, text);
}
