import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import { logger } from '../lib/logger';
import type {
  ContextSnapshot,
  GenerationReason,
  Routine,
  RoutineApprovalStatus,
  RoutineDay,
  RoutineDayExercise,
  RoutineLlmOutput,
  RoutineVersion,
  RoutineWithVersion,
} from '../types/routine.types';
import { ForbiddenError, NotFoundError } from '../utils/api-response';
import { findExerciseIdsByNames } from './exercises.repository';

export interface CreateRoutineVersionPayload {
  supabase: RequestSupabaseClient;
  userId: string;
  title: string;
  generationReason: GenerationReason;
  modelProvider: string;
  modelName: string;
  promptVersion: string;
  temperature: number;
  contextSnapshot: ContextSnapshot;
  llmOutput: RoutineLlmOutput;
  existingRoutineId?: string;
}

async function getRoutineByIdInternal(supabase: RequestSupabaseClient, routineId: string) {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('id', routineId)
    .maybeSingle<Routine>();

  throwIfSupabaseError(error, 'Failed to fetch routine.');
  return data ?? null;
}

async function deleteRoutineVersionQuietly(supabase: RequestSupabaseClient, versionId: string) {
  const { error } = await supabase.from('routine_versions').delete().eq('id', versionId);

  if (error) {
    logger.warn('Failed to clean up routine version after write error.', {
      versionId,
      error,
    });
  }
}

async function deleteRoutineQuietly(supabase: RequestSupabaseClient, routineId: string) {
  const { error } = await supabase.from('routines').delete().eq('id', routineId);

  if (error) {
    logger.warn('Failed to clean up routine after write error.', {
      routineId,
      error,
    });
  }
}

export async function listRoutinesByUser(supabase: RequestSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .returns<Routine[]>();

  throwIfSupabaseError(error, 'Failed to list routines.');
  return data ?? [];
}

export async function getRoutineById(
  supabase: RequestSupabaseClient,
  routineId: string,
  userId?: string,
) {
  const routine = await getRoutineByIdInternal(supabase, routineId);

  if (!routine) {
    throw new NotFoundError('Routine not found');
  }

  if (userId && routine.user_id !== userId) {
    throw new ForbiddenError('You do not own this routine');
  }

  return routine;
}

export async function listRoutineVersions(supabase: RequestSupabaseClient, routineId: string) {
  const { data, error } = await supabase
    .from('routine_versions')
    .select('*')
    .eq('routine_id', routineId)
    .order('version_number', { ascending: false })
    .returns<RoutineVersion[]>();

  throwIfSupabaseError(error, 'Failed to list routine versions.');
  return data ?? [];
}

export async function getRoutineVersionById(
  supabase: RequestSupabaseClient,
  versionId: string,
  userId?: string,
) {
  const { data: version, error } = await supabase
    .from('routine_versions')
    .select('*')
    .eq('id', versionId)
    .maybeSingle<RoutineVersion>();

  throwIfSupabaseError(error, 'Failed to fetch routine version.');

  if (!version) {
    throw new NotFoundError('Routine version not found');
  }

  const routine = await getRoutineById(supabase, version.routine_id, userId);

  return {
    ...version,
    routine,
  };
}

export async function getLatestApprovedVersion(
  supabase: RequestSupabaseClient,
  routineId: string,
) {
  const { data, error } = await supabase
    .from('routine_versions')
    .select('*')
    .eq('routine_id', routineId)
    .eq('approval_status', 'approved')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle<RoutineVersion>();

  throwIfSupabaseError(error, 'Failed to fetch latest approved routine version.');
  return data ?? null;
}

export async function getPendingProposedVersion(
  supabase: RequestSupabaseClient,
  routineId: string,
) {
  const { data, error } = await supabase
    .from('routine_versions')
    .select('*')
    .eq('routine_id', routineId)
    .eq('approval_status', 'proposed')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle<RoutineVersion>();

  throwIfSupabaseError(error, 'Failed to fetch pending routine version.');
  return data ?? null;
}

export async function getRoutineDays(
  supabase: RequestSupabaseClient,
  routineVersionId: string,
) {
  const { data, error } = await supabase
    .from('routine_days')
    .select('*')
    .eq('routine_version_id', routineVersionId)
    .order('day_index', { ascending: true })
    .returns<RoutineDay[]>();

  throwIfSupabaseError(error, 'Failed to fetch routine days.');
  return data ?? [];
}

export async function getRoutineDayById(supabase: RequestSupabaseClient, dayId: string) {
  const { data, error } = await supabase
    .from('routine_days')
    .select('*')
    .eq('id', dayId)
    .maybeSingle<RoutineDay>();

  throwIfSupabaseError(error, 'Failed to fetch routine day.');
  return data ?? null;
}

export async function getRoutineDayExercises(
  supabase: RequestSupabaseClient,
  routineDayId: string,
) {
  const { data, error } = await supabase
    .from('routine_day_exercises')
    .select('*')
    .eq('routine_day_id', routineDayId)
    .order('exercise_order', { ascending: true })
    .returns<RoutineDayExercise[]>();

  throwIfSupabaseError(error, 'Failed to fetch routine day exercises.');
  return data ?? [];
}

export async function getCurrentApprovedRoutineForUser(
  supabase: RequestSupabaseClient,
  userId: string,
) {
  const { data: routine, error } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<Routine>();

  throwIfSupabaseError(error, 'Failed to fetch current routine.');

  if (!routine) {
    return null;
  }

  const version = await getLatestApprovedVersion(supabase, routine.id);

  if (!version) {
    return null;
  }

  return {
    routine,
    version,
  };
}

export async function createRoutineWithVersion({
  supabase,
  userId,
  title,
  generationReason,
  modelProvider,
  modelName,
  promptVersion,
  temperature,
  contextSnapshot,
  llmOutput,
  existingRoutineId,
}: CreateRoutineVersionPayload): Promise<RoutineWithVersion> {
  let createdRoutineId: string | null = null;
  let createdVersionId: string | null = null;

  try {
    let routine: Routine;

    if (existingRoutineId) {
      const existingRoutine = await getRoutineByIdInternal(supabase, existingRoutineId);

      if (!existingRoutine) {
        throw new NotFoundError('Routine not found');
      }

      if (existingRoutine.user_id !== userId) {
        throw new ForbiddenError('You do not own this routine');
      }

      routine = existingRoutine;
    } else {
      const { data: insertedRoutine, error: routineError } = await supabase
        .from('routines')
        .insert({
          user_id: userId,
          title,
          status: 'archived',
        })
        .select('*')
        .single<Routine>();

      throwIfSupabaseError(routineError, 'Failed to create routine.');
      createdRoutineId = insertedRoutine.id;
      routine = insertedRoutine;
    }

    const { data: latestVersion, error: latestVersionError } = await supabase
      .from('routine_versions')
      .select('version_number')
      .eq('routine_id', routine.id)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle<{ version_number: number }>();

    throwIfSupabaseError(
      latestVersionError,
      'Failed to determine next routine version number.',
    );

    const { data: version, error: versionError } = await supabase
      .from('routine_versions')
      .insert({
        routine_id: routine.id,
        version_number: (latestVersion?.version_number ?? 0) + 1,
        generation_reason: generationReason,
        model_provider: modelProvider,
        model_name: modelName,
        prompt_version: promptVersion,
        temperature,
        context_snapshot: contextSnapshot,
        llm_output: llmOutput,
        safety_warnings: llmOutput.safety_warnings.join('\n'),
        approval_status: 'proposed',
      })
      .select('*')
      .single<RoutineVersion>();

    throwIfSupabaseError(versionError, 'Failed to create routine version.');
    createdVersionId = version.id;

    const exerciseNameMap = await findExerciseIdsByNames(
      supabase,
      Array.from(
        new Set(
          llmOutput.weekly_plan.flatMap((day) =>
            day.exercises.map((exercise) => exercise.exercise_name),
          ),
        ),
      ),
    );

    for (const day of llmOutput.weekly_plan) {
      const { data: routineDay, error: dayError } = await supabase
        .from('routine_days')
        .insert({
          routine_version_id: version.id,
          day_index: day.day_index,
          day_label: day.day_label,
          warmup_notes: day.warmup_notes,
          cooldown_notes: day.cooldown_notes,
        })
        .select('*')
        .single<RoutineDay>();

      throwIfSupabaseError(dayError, 'Failed to create routine day.');

      const exerciseRows = day.exercises.map((exercise, index) => ({
        routine_day_id: routineDay.id,
        exercise_id: exerciseNameMap.get(exercise.exercise_name) ?? null,
        exercise_name: exercise.exercise_name,
        exercise_order: index + 1,
        sets: exercise.sets,
        reps: exercise.reps,
        rest_seconds: exercise.rest_seconds,
        rpe: exercise.rpe,
        tempo: exercise.tempo,
        notes: exercise.notes,
      }));

      const { error: exerciseError } = await supabase
        .from('routine_day_exercises')
        .insert(exerciseRows);

      throwIfSupabaseError(exerciseError, 'Failed to create routine day exercises.');
    }

    return {
      routine,
      version,
    };
  } catch (error) {
    if (createdRoutineId && !existingRoutineId) {
      await deleteRoutineQuietly(supabase, createdRoutineId);
    } else if (createdVersionId) {
      await deleteRoutineVersionQuietly(supabase, createdVersionId);
    }

    throw error;
  }
}

export async function setRoutineStatus(
  supabase: RequestSupabaseClient,
  routineId: string,
  status: Routine['status'],
) {
  const { data, error } = await supabase
    .from('routines')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', routineId)
    .select('*')
    .maybeSingle<Routine>();

  throwIfSupabaseError(error, 'Failed to update routine status.');

  if (!data) {
    throw new NotFoundError('Routine not found');
  }

  return data;
}

export async function archiveOtherRoutines(
  supabase: RequestSupabaseClient,
  userId: string,
  activeRoutineId: string,
) {
  const { error } = await supabase
    .from('routines')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .neq('id', activeRoutineId);

  throwIfSupabaseError(error, 'Failed to archive other routines.');
}

export async function updateRoutineVersionStatus(
  supabase: RequestSupabaseClient,
  versionId: string,
  approvalStatus: RoutineApprovalStatus,
) {
  const { data, error } = await supabase
    .from('routine_versions')
    .update({
      approval_status: approvalStatus,
      approved_at: approvalStatus === 'approved' ? new Date().toISOString() : null,
    })
    .eq('id', versionId)
    .select('*')
    .maybeSingle<RoutineVersion>();

  throwIfSupabaseError(error, 'Failed to update routine version status.');

  if (!data) {
    throw new NotFoundError('Routine version not found');
  }

  return data;
}
