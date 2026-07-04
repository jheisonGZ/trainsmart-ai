import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import type { MealAnalysis } from '../types/nutrition-vision.types';

export interface CreateMealAnalysisPayload {
  id: string;
  user_id: string;
  source_image_path: string;
  source_image_content_type: string;
  ximilar_model: string;
  detected_tags: MealAnalysis['detected_tags'];
  detected_food_groups: string[];
  summary: string;
  educational_feedback: string;
  goal_alignment: string;
  ximilar_response: unknown;
}

export async function createMealAnalysis(
  supabase: RequestSupabaseClient,
  payload: CreateMealAnalysisPayload,
) {
  const { data, error } = await supabase
    .from('meal_analyses')
    .insert(payload)
    .select('*')
    .single<MealAnalysis>();

  throwIfSupabaseError(error, 'Failed to create meal analysis.');
  return data;
}

export async function getLatestMealAnalysisByUserId(
  supabase: RequestSupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from('meal_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<MealAnalysis>();

  throwIfSupabaseError(error, 'Failed to fetch latest meal analysis.');
  return data ?? null;
}

export async function listMealAnalysesByUserId(
  supabase: RequestSupabaseClient,
  userId: string,
  limit = 5,
) {
  const { data, error } = await supabase
    .from('meal_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<MealAnalysis[]>();

  throwIfSupabaseError(error, 'Failed to list meal analyses.');
  return data ?? [];
}
