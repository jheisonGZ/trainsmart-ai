import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import type { BodyMetric, HealthHistory } from '../types/health.types';
import { NotFoundError } from '../utils/api-response';
import type { BodyMetricInput, HealthHistoryInput } from '../validators/health.schemas';

function isHealthComplete(input: Partial<HealthHistory>) {
  return (
    Array.isArray(input.injuries) &&
    Array.isArray(input.joint_problems) &&
    Array.isArray(input.conditions) &&
    Array.isArray(input.limitations)
  );
}

export async function getHealthHistoryByUserId(
  supabase: RequestSupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from('health_history')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<HealthHistory>();

  throwIfSupabaseError(error, 'Failed to fetch health history.');
  return data ?? null;
}

export async function createHealthHistory(
  supabase: RequestSupabaseClient,
  userId: string,
  input: HealthHistoryInput,
) {
  const { data, error } = await supabase
    .from('health_history')
    .insert({
      user_id: userId,
      injuries: input.injuries,
      joint_problems: input.joint_problems,
      conditions: input.conditions,
      limitations: input.limitations,
      notes: input.notes ?? null,
      completed: isHealthComplete(input),
    })
    .select('*')
    .single<HealthHistory>();

  throwIfSupabaseError(error, 'Failed to create health history.');
  return data;
}

export async function updateHealthHistory(
  supabase: RequestSupabaseClient,
  userId: string,
  input: HealthHistoryInput,
) {
  const existing = await getHealthHistoryByUserId(supabase, userId);

  if (!existing) {
    throw new NotFoundError('Health history not found');
  }

  const merged: Partial<HealthHistory> = {
    ...existing,
    ...input,
  };

  const { data, error } = await supabase
    .from('health_history')
    .update({
      ...input,
      completed: isHealthComplete(merged),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle<HealthHistory>();

  throwIfSupabaseError(error, 'Failed to update health history.');

  if (!data) {
    throw new NotFoundError('Health history not found');
  }

  return data;
}

export async function listBodyMetrics(
  supabase: RequestSupabaseClient,
  userId: string,
  limit = 50,
  offset = 0,
) {
  const { data, error } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false })
    .range(offset, offset + limit - 1)
    .returns<BodyMetric[]>();

  throwIfSupabaseError(error, 'Failed to list body metrics.');
  return data ?? [];
}

export async function getLatestMetric(supabase: RequestSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: false })
    .limit(1)
    .maybeSingle<BodyMetric>();

  throwIfSupabaseError(error, 'Failed to fetch latest body metric.');
  return data ?? null;
}

export async function createBodyMetric(
  supabase: RequestSupabaseClient,
  userId: string,
  input: BodyMetricInput,
) {
  const { data, error } = await supabase
    .from('body_metrics')
    .insert({
      user_id: userId,
      measured_at: input.measured_at ?? new Date().toISOString(),
      weight_kg: input.weight_kg ?? null,
      height_cm: input.height_cm ?? null,
      notes: input.notes ?? null,
    })
    .select('*')
    .single<BodyMetric>();

  throwIfSupabaseError(error, 'Failed to create body metric.');
  return data;
}
