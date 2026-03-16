import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import {
  createBodyMetric,
  listBodyMetrics,
} from '../repositories/metrics.repository';
import type { BodyMetricInput, MetricQueryInput } from '../validators/health.schemas';

export async function getMyBodyMetrics(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  query: MetricQueryInput,
) {
  return listBodyMetrics(supabase, auth.userId, query.limit, query.offset);
}

export async function createMyBodyMetric(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  input: BodyMetricInput,
) {
  return createBodyMetric(supabase, auth.userId, input);
}
