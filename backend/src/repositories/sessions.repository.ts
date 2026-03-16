import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import { logger } from '../lib/logger';
import type {
  WorkoutSession,
  WorkoutSessionExercise,
} from '../types/session.types';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/api-response';
import {
  type CreateSessionInput,
  type FinishSessionInput,
  type SessionExerciseInput,
} from '../validators/sessions.schemas';
import { getRoutineDayExercises } from './routines.repository';

export interface RoutineDaySessionProgress {
  id: string;
  routine_day_id: string;
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

async function deleteSessionQuietly(supabase: RequestSupabaseClient, sessionId: string) {
  const { error } = await supabase.from('workout_sessions').delete().eq('id', sessionId);

  if (error) {
    logger.warn('Failed to clean up workout session after write error.', {
      sessionId,
      error,
    });
  }
}

export async function listSessionsByUser(
  supabase: RequestSupabaseClient,
  userId: string,
  limit = 50,
  offset = 0,
) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
    .returns<WorkoutSession[]>();

  throwIfSupabaseError(error, 'Failed to list workout sessions.');
  return data ?? [];
}

export async function getSessionById(
  supabase: RequestSupabaseClient,
  sessionId: string,
  userId?: string,
) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle<WorkoutSession>();

  throwIfSupabaseError(error, 'Failed to fetch workout session.');

  if (!data) {
    throw new NotFoundError('Workout session not found');
  }

  if (userId && data.user_id !== userId) {
    throw new ForbiddenError('You do not own this workout session');
  }

  return data;
}

export async function getSessionExercises(
  supabase: RequestSupabaseClient,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from('workout_session_exercises')
    .select('*')
    .eq('session_id', sessionId)
    .order('exercise_order', { ascending: true })
    .returns<WorkoutSessionExercise[]>();

  throwIfSupabaseError(error, 'Failed to fetch workout session exercises.');
  return data ?? [];
}

export async function createSession(
  supabase: RequestSupabaseClient,
  userId: string,
  input: CreateSessionInput,
) {
  let createdSessionId: string | null = null;

  try {
    if (input.routine_day_id) {
      const latestSessionForDay = await getLatestSessionForRoutineDay(
        supabase,
        userId,
        input.routine_day_id,
      );

      if (latestSessionForDay?.ended_at) {
        throw new ConflictError('This routine day has already been completed.');
      }

      if (latestSessionForDay && !latestSessionForDay.ended_at) {
        throw new ConflictError('This routine day already has an active workout session.');
      }
    }

    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        routine_version_id: input.routine_version_id ?? null,
        routine_day_id: input.routine_day_id ?? null,
        session_date: input.session_date,
        started_at: new Date().toISOString(),
        notes: input.notes ?? null,
      })
      .select('*')
      .single<WorkoutSession>();

    if (sessionError) {
      if (sessionError.code === '23505' && input.routine_day_id) {
        const latestSessionForDay = await getLatestSessionForRoutineDay(
          supabase,
          userId,
          input.routine_day_id,
        );

        if (latestSessionForDay?.ended_at) {
          throw new ConflictError('This routine day has already been completed.');
        }

        if (latestSessionForDay) {
          throw new ConflictError('This routine day already has an active workout session.');
        }
      }

      throwIfSupabaseError(sessionError, 'Failed to create workout session.');
    }

    createdSessionId = session.id;

    if (input.routine_day_id) {
      const plannedExercises = await getRoutineDayExercises(supabase, input.routine_day_id);

      if (plannedExercises.length > 0) {
        const { error: exerciseError } = await supabase.from('workout_session_exercises').insert(
          plannedExercises.map((exercise) => ({
            session_id: session.id,
            exercise_id: exercise.exercise_id,
            exercise_name: exercise.exercise_name,
            exercise_order: exercise.exercise_order,
            planned_sets: exercise.sets,
            planned_reps: exercise.reps,
            rest_seconds: exercise.rest_seconds,
          })),
        );

        throwIfSupabaseError(
          exerciseError,
          'Failed to initialize planned exercises for workout session.',
        );
      }
    }

    return session;
  } catch (error) {
    if (createdSessionId) {
      await deleteSessionQuietly(supabase, createdSessionId);
    }

    throw error;
  }
}

export async function addSessionExercise(
  supabase: RequestSupabaseClient,
  sessionId: string,
  userId: string,
  input: SessionExerciseInput,
) {
  await getSessionById(supabase, sessionId, userId);

  const { data, error } = await supabase
    .from('workout_session_exercises')
    .insert({
      session_id: sessionId,
      exercise_id: input.exercise_id ?? null,
      exercise_name: input.exercise_name,
      exercise_order: input.exercise_order,
      planned_sets: input.planned_sets ?? null,
      planned_reps: input.planned_reps ?? null,
      performed_sets: input.performed_sets ?? null,
      performed_reps: input.performed_reps ?? null,
      weight_kg: input.weight_kg ?? null,
      rest_seconds: input.rest_seconds ?? null,
    })
    .select('*')
    .single<WorkoutSessionExercise>();

  throwIfSupabaseError(error, 'Failed to add workout session exercise.');
  return data;
}

export async function finishSession(
  supabase: RequestSupabaseClient,
  sessionId: string,
  userId: string,
  input: FinishSessionInput,
) {
  const existingSession = await getSessionById(supabase, sessionId, userId);

  if (existingSession.ended_at) {
    throw new ConflictError('Workout session has already been completed.');
  }

  const endedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('workout_sessions')
    .update({
      ended_at: endedAt,
      perceived_effort: input.perceived_effort ?? null,
      difficulty_rating: input.difficulty_rating ?? null,
      pain_or_discomfort: input.pain_or_discomfort ?? null,
      notes: input.notes ?? null,
    })
    .eq('id', sessionId)
    .eq('user_id', userId)
    .is('ended_at', null)
    .select('*')
    .maybeSingle<WorkoutSession>();

  throwIfSupabaseError(error, 'Failed to finish workout session.');

  if (!data) {
    const persistedSession = await getSessionById(supabase, sessionId, userId);

    if (persistedSession.ended_at) {
      return persistedSession;
    }

    throw new ConflictError(
      'Workout session could not be finalized because the persisted state did not change.',
    );
  }

  return data;
}

export async function getRecentFeedbackSummary(
  supabase: RequestSupabaseClient,
  userId: string,
  limit = 5,
) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('session_date, perceived_effort, difficulty_rating, pain_or_discomfort, notes, created_at')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<
      Array<{
        session_date: string;
        perceived_effort: string | null;
        difficulty_rating: number | null;
        pain_or_discomfort: boolean | null;
        notes: string | null;
        created_at: string;
      }>
    >();

  throwIfSupabaseError(error, 'Failed to summarize recent workout feedback.');

  if (!data || data.length === 0) {
    return null;
  }

  return data
    .map((session) => {
      const parts = [`Sesion del ${session.session_date}`];

      if (session.perceived_effort) {
        const effortLabel =
          session.perceived_effort === 'easy'
            ? 'facil'
            : session.perceived_effort === 'moderate'
              ? 'moderado'
              : 'intenso';
        parts.push(`esfuerzo: ${effortLabel}`);
      }

      if (session.difficulty_rating) {
        parts.push(`dificultad: ${session.difficulty_rating}/10`);
      }

      if (session.pain_or_discomfort) {
        parts.push('dolor o molestia reportado');
      }

      if (session.notes) {
        parts.push(`notas: ${session.notes}`);
      }

      return parts.join(', ');
    })
    .join('\n');
}

export async function getLatestSessionForRoutineDay(
  supabase: RequestSupabaseClient,
  userId: string,
  routineDayId: string,
) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('routine_day_id', routineDayId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<WorkoutSession>();

  throwIfSupabaseError(error, 'Failed to fetch latest workout session for routine day.');
  return data ?? null;
}

export async function listRoutineDaySessionProgress(
  supabase: RequestSupabaseClient,
  userId: string,
  routineVersionId: string,
) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('id, routine_day_id, session_date, started_at, ended_at, created_at')
    .eq('user_id', userId)
    .eq('routine_version_id', routineVersionId)
    .not('routine_day_id', 'is', null)
    .order('created_at', { ascending: false })
    .returns<RoutineDaySessionProgress[]>();

  throwIfSupabaseError(error, 'Failed to list routine day session progress.');
  return (data ?? []).filter(
    (session): session is RoutineDaySessionProgress =>
      typeof session.routine_day_id === 'string' && session.routine_day_id.length > 0,
  );
}
