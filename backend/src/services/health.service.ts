import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import {
  createHealthHistory,
  getHealthHistoryByUserId,
  updateHealthHistory,
} from '../repositories/health.repository';
import type { HealthHistoryInput } from '../validators/health.schemas';

export async function getMyHealthHistory(supabase: RequestSupabaseClient, auth: AuthUser) {
  return getHealthHistoryByUserId(supabase, auth.userId);
}

export async function createMyHealthHistory(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  input: HealthHistoryInput,
) {
  return createHealthHistory(supabase, auth.userId, input);
}

export async function updateMyHealthHistory(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  input: HealthHistoryInput,
) {
  return updateHealthHistory(supabase, auth.userId, input);
}
