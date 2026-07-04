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
  quality_warnings: string[];
  body_focus_tags: string[];
  entry_summary: string;
  comparison_summary: string;
  comparison_notes: string;
  compared_to_entry_id: string | null;
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
