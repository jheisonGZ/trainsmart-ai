import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import type { MealAnalysis } from '../types/meal-analysis.types';

interface CreateMealAnalysisInput {
  userId: string;
  imageStoragePath: string;
  foodNames: string[];
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  rawResponse: unknown;
}

export async function createMealAnalysis(
  supabase: RequestSupabaseClient,
  input: CreateMealAnalysisInput,
) {
  const { data, error } = await supabase
    .from('meal_analyses')
    .insert({
      user_id: input.userId,
      image_storage_path: input.imageStoragePath,
      food_names: input.foodNames,
      calories: input.calories,
      protein_g: input.proteinG,
      carbs_g: input.carbsG,
      fat_g: input.fatG,
      raw_response: input.rawResponse,
    })
    .select('*')
    .single<MealAnalysis>();

  throwIfSupabaseError(error, 'Failed to create meal analysis.');
  return data;
}

export async function listMealAnalyses(
  supabase: RequestSupabaseClient,
  userId: string,
  limit = 20,
  offset = 0,
) {
  const { data, error } = await supabase
    .from('meal_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
    .returns<MealAnalysis[]>();

  throwIfSupabaseError(error, 'Failed to list meal analyses.');
  return data ?? [];
}

export async function deleteAllMealAnalyses(supabase: RequestSupabaseClient, userId: string) {
  const { data: rows, error: selectError } = await supabase
    .from('meal_analyses')
    .select('image_storage_path')
    .eq('user_id', userId)
    .returns<Array<{ image_storage_path: string }>>();

  throwIfSupabaseError(selectError, 'Failed to list meal analyses for deletion.');

  const { error: deleteError } = await supabase
    .from('meal_analyses')
    .delete()
    .eq('user_id', userId);

  throwIfSupabaseError(deleteError, 'Failed to delete meal analyses.');

  return (rows ?? []).map((row) => row.image_storage_path);
}
