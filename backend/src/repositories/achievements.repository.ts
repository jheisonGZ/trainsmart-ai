import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import type { Achievement } from '../types/achievement.types';

export async function getUnlockedAchievements(supabase: RequestSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false })
    .returns<Achievement[]>();

  throwIfSupabaseError(error, 'Failed to list achievements.');
  return data ?? [];
}

export async function unlockAchievement(
  supabase: RequestSupabaseClient,
  userId: string,
  achievementKey: string,
) {
  const { data, error } = await supabase
    .from('achievements')
    .upsert(
      { user_id: userId, achievement_key: achievementKey },
      { onConflict: 'user_id,achievement_key', ignoreDuplicates: true },
    )
    .select('*')
    .maybeSingle<Achievement>();

  throwIfSupabaseError(error, 'Failed to unlock achievement.');
  return data;
}
