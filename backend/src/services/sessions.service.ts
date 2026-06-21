import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import {
  addSessionExercise,
  createSession,
  finishSession,
  getSessionById,
  getSessionExercises,
  listSessionsByUser,
  updateSessionExerciseProgress,
} from '../repositories/sessions.repository';
import type {
  CreateSessionInput,
  FinishSessionInput,
  SessionExerciseInput,
  SessionListQueryInput,
  UpdateSessionExerciseProgressInput,
} from '../validators/sessions.schemas';
import { lockRoutineAudio } from './routineAudio.service';

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

export async function updateExerciseProgressForSession(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  sessionId: string,
  exerciseOrder: number,
  input: UpdateSessionExerciseProgressInput,
) {
  return updateSessionExerciseProgress(
    supabase,
    sessionId,
    auth.userId,
    exerciseOrder,
    input,
  );
}

export async function finishMySession(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  sessionId: string,
  input: FinishSessionInput,
) {
  const session = await finishSession(supabase, sessionId, auth.userId, input);
  await lockRoutineAudio(supabase, auth, sessionId);
  return session;
}
