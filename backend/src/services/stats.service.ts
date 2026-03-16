import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import { getUserProgressStats } from '../repositories/stats.repository';

export async function getMyProgressStats(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  weeks = 8,
) {
  return getUserProgressStats(supabase, auth.userId, weeks);
}
