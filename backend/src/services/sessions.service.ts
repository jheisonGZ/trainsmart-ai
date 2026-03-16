import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import {
  addSessionExercise,
  createSession,
  finishSession,
  getSessionById,
  getSessionExercises,
  listSessionsByUser,
} from '../repositories/sessions.repository';
import type {
  CreateSessionInput,
  FinishSessionInput,
  SessionExerciseInput,
  SessionListQueryInput,
} from '../validators/sessions.schemas';

export async function listMySessions(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  query: SessionListQueryInput,
) {
  return listSessionsByUser(supabase, auth.userId, query.limit, query.offset);
}

export async function createMySession(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  input: CreateSessionInput,
) {
  return createSession(supabase, auth.userId, input);
}

export async function getMySession(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  sessionId: string,
) {
  const session = await getSessionById(supabase, sessionId, auth.userId);
  const exercises = await getSessionExercises(supabase, sessionId);

  return {
    ...session,
    exercises,
  };
}

export async function addExerciseToSession(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  sessionId: string,
  input: SessionExerciseInput,
) {
  return addSessionExercise(supabase, sessionId, auth.userId, input);
}

export async function finishMySession(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  sessionId: string,
  input: FinishSessionInput,
) {
  return finishSession(supabase, sessionId, auth.userId, input);
}
