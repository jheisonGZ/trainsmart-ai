import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import type { EnvironmentAnalysis } from '../types/environment-analysis.types';
import { NotFoundError } from '../utils/api-response';

interface CreateEnvironmentAnalysisInput {
  userId: string;
  imageStoragePath: string;
  equipmentDetected: string[];
  analysisText: string;
}

export async function createEnvironmentAnalysis(
  supabase: RequestSupabaseClient,
  input: CreateEnvironmentAnalysisInput,
) {
  const { data, error } = await supabase
    .from('environment_analyses')
    .insert({
      user_id: input.userId,
      image_storage_path: input.imageStoragePath,
      equipment_detected: input.equipmentDetected,
      analysis_text: input.analysisText,
    })
    .select('*')
    .single<EnvironmentAnalysis>();

  throwIfSupabaseError(error, 'Failed to create environment analysis.');
  return data;
}

export async function getEnvironmentAnalysisById(
  supabase: RequestSupabaseClient,
  id: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('environment_analyses')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle<EnvironmentAnalysis>();

  throwIfSupabaseError(error, 'Failed to fetch environment analysis.');

  if (!data) {
    throw new NotFoundError('Environment analysis not found');
  }

  return data;
}

export async function listEnvironmentAnalyses(
  supabase: RequestSupabaseClient,
  userId: string,
  limit = 20,
  offset = 0,
) {
  const { data, error } = await supabase
    .from('environment_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
    .returns<EnvironmentAnalysis[]>();

  throwIfSupabaseError(error, 'Failed to list environment analyses.');
  return data ?? [];
}

export async function deleteAllEnvironmentAnalyses(
  supabase: RequestSupabaseClient,
  userId: string,
) {
  const { data: rows, error: selectError } = await supabase
    .from('environment_analyses')
    .select('image_storage_path')
    .eq('user_id', userId)
    .returns<Array<{ image_storage_path: string }>>();

  throwIfSupabaseError(selectError, 'Failed to list environment analyses for deletion.');

  const { error: deleteError } = await supabase
    .from('environment_analyses')
    .delete()
    .eq('user_id', userId);

  throwIfSupabaseError(deleteError, 'Failed to delete environment analyses.');

  return (rows ?? []).map((row) => row.image_storage_path);
}
