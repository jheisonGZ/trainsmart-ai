import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import type { BodyProgressEntry } from '../types/body-progress-vision.types';

export interface CreateBodyProgressEntryPayload {
  id: string;
  user_id: string;
  source_image_path: string;
  source_image_content_type: string;
  ximilar_tagging_model: string;
  ximilar_person_model: string;
  detected_tags: BodyProgressEntry['detected_tags'];
  person_count: number;
  body_focus_tags: string[];
  posture_inferred: string | null;
  visible_body_zones: string[];
  compared_to_entry_id: string | null;
  is_baseline: boolean;
  same_person_check: BodyProgressEntry['same_person_check'];
  same_person_note: string | null;
  category_comparison: BodyProgressEntry['category_comparison'] | null;
  overall_change_level: BodyProgressEntry['overall_change_level'];
  progress_summary: string;
  observations: string[];
  reliability_warning: string | null;
  next_capture_recommendations: string[];
  measurement_disclaimer: string;
  comparison_method: BodyProgressEntry['comparison_method'];
  ximilar_tagging_response: unknown;
  ximilar_person_response: unknown;
}

export async function createBodyProgressEntry(
  supabase: RequestSupabaseClient,
  payload: CreateBodyProgressEntryPayload,
) {
  const { data, error } = await supabase
    .from('body_progress_entries')
    .insert(payload)
    .select('*')
    .single<BodyProgressEntry>();

  throwIfSupabaseError(error, 'Failed to create body progress entry.');
  return data;
}

export async function getLatestBodyProgressEntryByUserId(
  supabase: RequestSupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from('body_progress_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<BodyProgressEntry>();

  throwIfSupabaseError(error, 'Failed to fetch latest body progress entry.');
  return data ?? null;
}

export async function getBodyProgressEntryImagePathById(
  supabase: RequestSupabaseClient,
  id: string,
) {
  const { data, error } = await supabase
    .from('body_progress_entries')
    .select('source_image_path')
    .eq('id', id)
    .maybeSingle<{ source_image_path: string }>();

  throwIfSupabaseError(error, 'Failed to fetch previous body progress image.');
  return data?.source_image_path ?? null;
}

export async function getBodyProgressEntryById(
  supabase: RequestSupabaseClient,
  id: string,
) {
  const { data, error } = await supabase
    .from('body_progress_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle<BodyProgressEntry>();

  throwIfSupabaseError(error, 'Failed to fetch body progress entry.');
  return data ?? null;
}

export interface UpdateBodyProgressComparisonPayload {
  category_comparison: BodyProgressEntry['category_comparison'] | null;
  overall_change_level: BodyProgressEntry['overall_change_level'];
  progress_summary: string;
  observations: string[];
  reliability_warning: string | null;
  comparison_method: BodyProgressEntry['comparison_method'];
}

export async function updateBodyProgressEntryComparison(
  supabase: RequestSupabaseClient,
  id: string,
  payload: UpdateBodyProgressComparisonPayload,
) {
  const { data, error } = await supabase
    .from('body_progress_entries')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single<BodyProgressEntry>();

  throwIfSupabaseError(error, 'Failed to update body progress comparison.');
  return data;
}

export async function listBodyProgressEntriesByUserId(
  supabase: RequestSupabaseClient,
  userId: string,
  limit = 6,
) {
  const { data, error } = await supabase
    .from('body_progress_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<BodyProgressEntry[]>();

  throwIfSupabaseError(error, 'Failed to list body progress entries.');
  return data ?? [];
}
