import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import type { EnvironmentAnalysis } from '../types/environment-vision.types';

export interface CreateEnvironmentAnalysisPayload {
  id: string;
  user_id: string;
  source_image_path: string;
  source_image_content_type: string;
  ximilar_model: string;
  detected_tags: EnvironmentAnalysis['detected_tags'];
  detected_equipment: string[];
  detected_space_tags: string[];
  summary: string;
  training_context: string;
  ximilar_response: unknown;
}

export async function createEnvironmentAnalysis(
  supabase: RequestSupabaseClient,
  payload: CreateEnvironmentAnalysisPayload,
) {
  const { data, error } = await supabase
    .from('environment_analyses')
    .insert(payload)
    .select('*')
    .single<EnvironmentAnalysis>();

  throwIfSupabaseError(error, 'Failed to create environment analysis.');
  return data;
}

export async function getLatestEnvironmentAnalysisByUserId(
  supabase: RequestSupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from('environment_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<EnvironmentAnalysis>();

  throwIfSupabaseError(error, 'Failed to fetch latest environment analysis.');
  return data ?? null;
}
