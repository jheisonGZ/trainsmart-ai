import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import { buildRoutinePrompt } from '../prompts/prompt-builder';
import { generateStructuredRoutine } from '../lib/llm';
import { getHealthHistoryByUserId } from '../repositories/health.repository';
import { getLatestMetric } from '../repositories/metrics.repository';
import {
  createRoutineWithVersion,
  getPendingProposedVersion,
  getRoutineById,
} from '../repositories/routines.repository';
import { getRecentFeedbackSummary } from '../repositories/sessions.repository';
import { getProfileByUserId } from '../repositories/profiles.repository';
import type { ContextSnapshot } from '../types/routine.types';
import { PreconditionFailedError } from '../utils/api-response';
import type {
  RoutineGenerateInput,
  RoutineRegenerateInput,
} from '../validators/routines.schemas';

async function buildRoutineContext(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
): Promise<ContextSnapshot> {
  const [profile, health, latestMetrics, feedbackSummary] = await Promise.all([
    getProfileByUserId(supabase, auth.userId),
    getHealthHistoryByUserId(supabase, auth.userId),
    getLatestMetric(supabase, auth.userId),
    getRecentFeedbackSummary(supabase, auth.userId),
  ]);

  if (!profile) {
    throw new PreconditionFailedError('Profile must exist before generating a routine.');
  }

  if (!profile.completed) {
    throw new PreconditionFailedError('Profile must be completed before generating a routine.');
  }

  if (!profile.profile_confirmed) {
    throw new PreconditionFailedError('Profile must be confirmed before generating a routine.');
  }

  if (!health || !health.completed) {
    throw new PreconditionFailedError(
      'Health history must be completed before generating a routine.',
    );
  }

  return {
    profile: {
      user_id: profile.user_id,
      name: profile.name,
      birth_date: profile.birth_date,
      age: profile.age,
      sex: profile.sex,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,
      experience_level: profile.experience_level,
      goal: profile.goal,
      days_per_week: profile.days_per_week,
      time_per_session: profile.time_per_session,
      bmi: profile.bmi,
      bmi_category: profile.bmi_category,
      profile_confirmed: profile.profile_confirmed,
      completed: profile.completed,
      confirmed_at: profile.confirmed_at,
      email: profile.email,
      avatar_url: profile.avatar_url,
      auth_provider: profile.auth_provider,
      auth_providers: profile.auth_providers,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    },
    health: {
      user_id: health.user_id,
      injuries: health.injuries,
      joint_problems: health.joint_problems,
      conditions: health.conditions,
      limitations: health.limitations,
      notes: health.notes,
      completed: health.completed,
      created_at: health.created_at,
      updated_at: health.updated_at,
    },
    latest_metrics: latestMetrics
      ? {
          id: latestMetrics.id,
          measured_at: latestMetrics.measured_at,
          weight_kg: latestMetrics.weight_kg,
          height_cm: latestMetrics.height_cm,
          bmi: latestMetrics.bmi,
          notes: latestMetrics.notes,
        }
      : null,
    feedback_summary: feedbackSummary,
  };
}

export async function generateInitialRoutine(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  input: RoutineGenerateInput,
) {
  const contextSnapshot = await buildRoutineContext(supabase, auth);
  const prompt = buildRoutinePrompt({
    contextSnapshot,
    customInstructions: input.customInstructions,
  });

  const llmResult = await generateStructuredRoutine(
    prompt.systemPrompt,
    prompt.userPrompt,
  );

  return createRoutineWithVersion({
    supabase,
    userId: auth.userId,
    title: llmResult.output.title,
    generationReason: 'initial',
    modelProvider: llmResult.modelProvider,
    modelName: llmResult.modelName,
    promptVersion: prompt.promptVersion,
    temperature: llmResult.temperature,
    contextSnapshot,
    llmOutput: llmResult.output,
  });
}

export async function regenerateRoutine(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  routineId: string,
  input: RoutineRegenerateInput,
) {
  await getRoutineById(supabase, routineId, auth.userId);

  const pendingVersion = await getPendingProposedVersion(supabase, routineId);

  if (pendingVersion) {
    throw new PreconditionFailedError(
      'There is already a proposed version pending review for this routine.',
    );
  }

  const contextSnapshot = await buildRoutineContext(supabase, auth);
  const prompt = buildRoutinePrompt({
    contextSnapshot,
    customInstructions: input.customInstructions,
    reason: input.reason,
  });

  const llmResult = await generateStructuredRoutine(
    prompt.systemPrompt,
    prompt.userPrompt,
  );

  return createRoutineWithVersion({
    supabase,
    userId: auth.userId,
    title: llmResult.output.title,
    generationReason: 'regenerate',
    modelProvider: llmResult.modelProvider,
    modelName: llmResult.modelName,
    promptVersion: prompt.promptVersion,
    temperature: llmResult.temperature,
    contextSnapshot,
    llmOutput: llmResult.output,
    existingRoutineId: routineId,
  });
}
