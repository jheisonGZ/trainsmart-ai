import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import type { UserStatistics } from '../types/user-statistics.types';

export async function getUserStatistics(supabase: RequestSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('user_statistics')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<UserStatistics>();

  throwIfSupabaseError(error, 'Failed to fetch user statistics.');
  return data;
}

type ReplaceUserStatisticsInput = Omit<UserStatistics, 'updated_at'>;

export async function replaceUserStatistics(
  supabase: RequestSupabaseClient,
  stats: ReplaceUserStatisticsInput,
) {
  const { data, error } = await supabase
    .from('user_statistics')
    .upsert(
      {
        ...stats,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single<UserStatistics>();

  throwIfSupabaseError(error, 'Failed to save user statistics.');
  return data;
}
