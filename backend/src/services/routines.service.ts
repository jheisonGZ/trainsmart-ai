import type { RequestSupabaseClient } from '../lib/supabase/request';
import type { AuthUser } from '../types/auth.types';
import {
  getCurrentApprovedRoutineForUser,
  getRoutineById,
  getRoutineDayExercises,
  getRoutineDays,
  getRoutineVersionById,
  listRoutineVersions,
  listRoutinesByUser,
} from '../repositories/routines.repository';
import { listRoutineDaySessionProgress } from '../repositories/sessions.repository';
import type {
  RoutineDashboardDay,
  RoutineTodayStatus,
} from '../types/routine.types';
import { getDayIndexFromDate } from '../utils/dates';
import { NotFoundError } from '../utils/api-response';

async function getHydratedRoutineDays(
  supabase: RequestSupabaseClient,
  versionId: string,
) {
  const days = await getRoutineDays(supabase, versionId);
  const hydratedDays: RoutineDashboardDay[] = [];

  for (const day of days) {
    const exercises = await getRoutineDayExercises(supabase, day.id);
    hydratedDays.push({
      ...day,
      exercises,
    });
  }

  return hydratedDays;
}

function getNextPlannedDay(
  days: RoutineDashboardDay[],
  currentDay: RoutineDashboardDay,
  completedDayIds: Set<string>,
) {
  return (
    days.find(
      (day) => day.day_index > currentDay.day_index && !completedDayIds.has(day.id),
    ) ??
    null
  );
}

async function getRoutineProgressSnapshot(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  versionId: string,
) {
  const sessionProgress = await listRoutineDaySessionProgress(
    supabase,
    auth.userId,
    versionId,
  );
  const latestSessionByDayId = new Map<string, (typeof sessionProgress)[number]>();
  const latestCompletedSessionByDayId = new Map<string, (typeof sessionProgress)[number]>();
  const completedDayIds = new Set<string>();

  for (const session of sessionProgress) {
    if (!latestSessionByDayId.has(session.routine_day_id)) {
      latestSessionByDayId.set(session.routine_day_id, session);
    }

    if (session.ended_at) {
      completedDayIds.add(session.routine_day_id);

      if (!latestCompletedSessionByDayId.has(session.routine_day_id)) {
        latestCompletedSessionByDayId.set(session.routine_day_id, session);
      }
    }
  }

  const latestSessions = Array.from(latestSessionByDayId.values()).sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );
  const latestActiveSession =
    latestSessions.find(
      (session) =>
        !session.ended_at && !completedDayIds.has(session.routine_day_id),
    ) ?? null;

  return {
    latestSessionByDayId,
    latestCompletedSessionByDayId,
    completedDayIds,
    activeSessionId: latestActiveSession?.id ?? null,
    activeRoutineDayId: latestActiveSession?.routine_day_id ?? null,
  };
}

function resolveTodayStatus(
  dayId: string,
  completedDayIds: Set<string>,
  activeRoutineDayId: string | null,
): RoutineTodayStatus {
  if (activeRoutineDayId === dayId) {
    return 'in_progress';
  }

  if (completedDayIds.has(dayId)) {
    return 'completed';
  }

  return 'available';
}

export async function listMyRoutines(supabase: RequestSupabaseClient, auth: AuthUser) {
  return listRoutinesByUser(supabase, auth.userId);
}

export async function getMyRoutine(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  routineId: string,
) {
  return getRoutineById(supabase, routineId, auth.userId);
}

export async function getMyRoutineVersions(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  routineId: string,
) {
  await getRoutineById(supabase, routineId, auth.userId);
  return listRoutineVersions(supabase, routineId);
}

export async function getMyRoutineVersion(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  versionId: string,
) {
  return getRoutineVersionById(supabase, versionId, auth.userId);
}

export async function getCurrentRoutineDashboard(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
) {
  const current = await getCurrentApprovedRoutineForUser(supabase, auth.userId);

  if (!current) {
    throw new NotFoundError('No active approved routine found.');
  }

  return {
    routine: current.routine,
    version: current.version,
    days: await getHydratedRoutineDays(supabase, current.version.id),
    suggested_day_index: getDayIndexFromDate(),
  };
}

export async function getCurrentRoutineToday(
  supabase: RequestSupabaseClient,
  auth: AuthUser,
  requestedDayIndex?: number,
) {
  const current = await getCurrentApprovedRoutineForUser(supabase, auth.userId);

  if (!current) {
    throw new NotFoundError('No active approved routine found.');
  }

  const days = await getHydratedRoutineDays(supabase, current.version.id);
  const progress = await getRoutineProgressSnapshot(supabase, auth, current.version.id);

  if (days.length === 0) {
    throw new NotFoundError('The active routine has no configured workout days.');
  }

  const targetDayIndex = requestedDayIndex ?? getDayIndexFromDate();
  const exactMatch = days.find((day) => day.day_index === targetDayIndex);
  const fallbackDay =
    days.find((day) => day.day_index > targetDayIndex) ??
    [...days].sort((left, right) => left.day_index - right.day_index)[0];
  const today = exactMatch ?? fallbackDay;

  if (!today) {
    throw new NotFoundError('The active routine has no accessible workout day.');
  }

  const latestSessionForToday = progress.latestSessionByDayId.get(today.id) ?? null;
  const latestCompletedSessionForToday =
    progress.latestCompletedSessionByDayId.get(today.id) ?? null;
  const todayStatus = resolveTodayStatus(
    today.id,
    progress.completedDayIds,
    progress.activeRoutineDayId,
  );
  const nextDay = getNextPlannedDay(days, today, progress.completedDayIds);

  return {
    routine: current.routine,
    version: current.version,
    today,
    requested_day_index: targetDayIndex,
    actual_day_index: today.day_index,
    today_status: todayStatus,
    completed_at:
      todayStatus === 'completed'
        ? latestCompletedSessionForToday?.ended_at ?? latestSessionForToday?.ended_at ?? null
        : null,
    next_day: nextDay,
    completed_day_count: progress.completedDayIds.size,
    total_day_count: days.length,
    active_session_id: todayStatus === 'in_progress' ? latestSessionForToday?.id ?? null : null,
  };
}
