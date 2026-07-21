import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import type { BodyProgressAnalysis } from '../types/body-progress-analysis.types';
import { NotFoundError } from '../utils/api-response';

interface CreateBodyProgressAnalysisInput {
  userId: string;
  imageStoragePath: string;
  analysisText: string;
}

export async function createBodyProgressAnalysis(
  supabase: RequestSupabaseClient,
  input: CreateBodyProgressAnalysisInput,
) {
  const { data, error } = await supabase
    .from('body_progress_analyses')
    .insert({
      user_id: input.userId,
      image_storage_path: input.imageStoragePath,
      analysis_text: input.analysisText,
    })
    .select('*')
    .single<BodyProgressAnalysis>();

  throwIfSupabaseError(error, 'Failed to create body progress analysis.');
  return data;
}

export async function getBodyProgressAnalysisById(
  supabase: RequestSupabaseClient,
  id: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from('body_progress_analyses')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle<BodyProgressAnalysis>();

  throwIfSupabaseError(error, 'Failed to fetch body progress analysis.');

  if (!data) {
    throw new NotFoundError('Body progress analysis not found');
  }

  return data;
}

export async function listBodyProgressAnalyses(
  supabase: RequestSupabaseClient,
  userId: string,
  limit = 20,
  offset = 0,
) {
  const { data, error } = await supabase
    .from('body_progress_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
    .returns<BodyProgressAnalysis[]>();

  throwIfSupabaseError(error, 'Failed to list body progress analyses.');
  return data ?? [];
}

export async function deleteAllBodyProgressAnalyses(
  supabase: RequestSupabaseClient,
  userId: string,
) {
  const { data: rows, error: selectError } = await supabase
    .from('body_progress_analyses')
    .select('image_storage_path')
    .eq('user_id', userId)
    .returns<Array<{ image_storage_path: string }>>();

  throwIfSupabaseError(selectError, 'Failed to list body progress analyses for deletion.');

  const { error: deleteError } = await supabase
    .from('body_progress_analyses')
    .delete()
    .eq('user_id', userId);

  throwIfSupabaseError(deleteError, 'Failed to delete body progress analyses.');

  return (rows ?? []).map((row) => row.image_storage_path);
}
