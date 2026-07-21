import { ACHIEVEMENT_DEFINITIONS } from '../constants/achievements';
import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import { getProfileByUserId } from '../repositories/profiles.repository';
import {
  getPersonalRecordsForExercise,
  upsertPersonalRecord,
} from '../repositories/personal-records.repository';
import { getUserStatistics, replaceUserStatistics } from '../repositories/user-statistics.repository';
import {
  getUnlockedAchievements,
  unlockAchievement,
} from '../repositories/achievements.repository';
import { getIsoDate, getWeekStart } from '../utils/dates';
import type { PersonalRecord } from '../types/personal-record.types';
import type { Achievement } from '../types/achievement.types';
import type { WorkoutSession, WorkoutSessionExercise } from '../types/session.types';

const DEFAULT_BODYWEIGHT_KG = 70;
const RESISTANCE_TRAINING_MET = 6;

/**
 * `performed_reps` is a free-text field (planned as a range like "8-12", or a
 * clean number once actually logged). Best-effort extraction of a usable
 * number for volume/PR math without requiring a UI change in this phase.
 */
function parseRepsCount(performedReps: string | null): number | null {
  if (!performedReps) {
    return null;
  }

  const cleanNumber = Number(performedReps.trim());

  if (Number.isFinite(cleanNumber) && cleanNumber > 0) {
    return cleanNumber;
  }

  const firstNumberMatch = performedReps.match(/\d+/);
  return firstNumberMatch ? Number(firstNumberMatch[0]) : null;
}

function computeExerciseVolume(exercise: WorkoutSessionExercise): number {
  const reps = exercise.performed_reps_count ?? parseRepsCount(exercise.performed_reps);
  const sets = exercise.performed_sets ?? 0;
  const weight = exercise.weight_kg ?? 0;

  if (!reps || !sets || !weight) {
    return 0;
  }

  return weight * sets * reps;
}

function computeStreaks(sessionDatesAscending: string[]): { current: number; longest: number } {
  if (sessionDatesAscending.length === 0) {
    return { current: 0, longest: 0 };
  }

  let longest = 1;
  let run = 1;

  for (let index = 1; index < sessionDatesAscending.length; index += 1) {
    const previous = new Date(`${sessionDatesAscending[index - 1]}T00:00:00Z`);
    const current = new Date(`${sessionDatesAscending[index]}T00:00:00Z`);
    const diffDays = Math.round((current.getTime() - previous.getTime()) / 86_400_000);

    run = diffDays === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const today = getIsoDate();
  const yesterday = getIsoDate(new Date(Date.now() - 86_400_000));
  const lastDate = sessionDatesAscending[sessionDatesAscending.length - 1];

  let current = 0;

  if (lastDate === today || lastDate === yesterday) {
    current = 1;

    for (let index = sessionDatesAscending.length - 1; index > 0; index -= 1) {
      const currDate = new Date(`${sessionDatesAscending[index]}T00:00:00Z`);
      const prevDate = new Date(`${sessionDatesAscending[index - 1]}T00:00:00Z`);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86_400_000);

      if (diffDays === 1) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return { current, longest };
}

function computeBestWeekSessions(sessionDates: string[]): number {
  const perWeek = new Map<string, number>();

  for (const date of sessionDates) {
    const weekKey = getIsoDate(getWeekStart(new Date(`${date}T00:00:00Z`)));
    perWeek.set(weekKey, (perWeek.get(weekKey) ?? 0) + 1);
  }

  return Math.max(0, ...perWeek.values());
}

async function updateSessionAggregates(
  supabase: RequestSupabaseClient,
  session: WorkoutSession,
  exercises: WorkoutSessionExercise[],
) {
  const startedAt = session.started_at ? new Date(session.started_at).getTime() : null;
  const endedAt = session.ended_at ? new Date(session.ended_at).getTime() : null;
  const durationSeconds =
    startedAt && endedAt && endedAt > startedAt ? Math.round((endedAt - startedAt) / 1000) : null;

  const totalVolumeKg = exercises.reduce((sum, exercise) => sum + computeExerciseVolume(exercise), 0);
  const totalSets = exercises.reduce((sum, exercise) => sum + (exercise.performed_sets ?? 0), 0);
  const totalExercises = exercises.length;

  const profile = await getProfileByUserId(supabase, session.user_id);
  const bodyweightKg = profile?.weight_kg ?? DEFAULT_BODYWEIGHT_KG;
  const durationHours = durationSeconds ? durationSeconds / 3600 : 0;
  const caloriesEstimated = Math.round(RESISTANCE_TRAINING_MET * bodyweightKg * durationHours);

  const { error } = await supabase
    .from('workout_sessions')
    .update({
      duration_seconds: durationSeconds,
      total_volume_kg: totalVolumeKg,
      total_sets: totalSets,
      total_exercises: totalExercises,
      calories_estimated: caloriesEstimated,
    })
    .eq('id', session.id);

  throwIfSupabaseError(error, 'Failed to update session aggregates.');

  return { totalVolumeKg, totalSets, totalExercises, durationSeconds: durationSeconds ?? 0 };
}

async function recomputeUserStatistics(supabase: RequestSupabaseClient, userId: string) {
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select('session_date, duration_seconds, total_volume_kg, total_sets, total_exercises')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .returns<
      Array<{
        session_date: string;
        duration_seconds: number | null;
        total_volume_kg: number | null;
        total_sets: number | null;
        total_exercises: number | null;
      }>
    >();

  throwIfSupabaseError(error, 'Failed to recompute user statistics.');

  const rows = sessions ?? [];
  const sessionDatesAscending = Array.from(new Set(rows.map((row) => row.session_date))).sort();
  const streaks = computeStreaks(sessionDatesAscending);

  const stats = {
    user_id: userId,
    total_sessions: rows.length,
    total_time_trained_seconds: rows.reduce((sum, row) => sum + (row.duration_seconds ?? 0), 0),
    total_volume_kg: rows.reduce((sum, row) => sum + (row.total_volume_kg ?? 0), 0),
    total_sets: rows.reduce((sum, row) => sum + (row.total_sets ?? 0), 0),
    total_exercises_logged: rows.reduce((sum, row) => sum + (row.total_exercises ?? 0), 0),
    current_streak_days: streaks.current,
    longest_streak_days: streaks.longest,
    best_week_sessions: computeBestWeekSessions(sessionDatesAscending),
    last_session_at: sessionDatesAscending[sessionDatesAscending.length - 1] ?? null,
  };

  return replaceUserStatistics(supabase, stats);
}

async function detectPersonalRecords(
  supabase: RequestSupabaseClient,
  userId: string,
  sessionId: string,
  exercises: WorkoutSessionExercise[],
): Promise<PersonalRecord[]> {
  const newRecords: PersonalRecord[] = [];

  for (const exercise of exercises) {
    const weight = exercise.weight_kg;
    const volume = computeExerciseVolume(exercise);

    if (!weight && !volume) {
      continue;
    }

    const existingRecords = await getPersonalRecordsForExercise(
      supabase,
      userId,
      exercise.exercise_name,
    );
    const existingByType = new Map(existingRecords.map((record) => [record.record_type, record]));

    if (weight) {
      const existing = existingByType.get('max_weight');

      if (!existing || weight > existing.value) {
        newRecords.push(
          await upsertPersonalRecord(supabase, {
            userId,
            exerciseName: exercise.exercise_name,
            recordType: 'max_weight',
            value: weight,
            previousValue: existing?.value ?? null,
            sessionId,
          }),
        );
      }
    }

    if (volume) {
      const existing = existingByType.get('max_volume_session');

      if (!existing || volume > existing.value) {
        newRecords.push(
          await upsertPersonalRecord(supabase, {
            userId,
            exerciseName: exercise.exercise_name,
            recordType: 'max_volume_session',
            value: volume,
            previousValue: existing?.value ?? null,
            sessionId,
          }),
        );
      }
    }
  }

  return newRecords;
}

async function countPersonalRecords(supabase: RequestSupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from('personal_records')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  throwIfSupabaseError(error, 'Failed to count personal records for achievements.');
  return count ?? 0;
}

async function detectNewAchievements(
  supabase: RequestSupabaseClient,
  userId: string,
): Promise<Achievement[]> {
  const [stats, personalRecordCount, unlockedAchievements] = await Promise.all([
    getUserStatistics(supabase, userId),
    countPersonalRecords(supabase, userId),
    getUnlockedAchievements(supabase, userId),
  ]);

  if (!stats) {
    return [];
  }

  const unlockedKeys = new Set(unlockedAchievements.map((achievement) => achievement.achievement_key));
  const newlyUnlocked: Achievement[] = [];

  for (const definition of ACHIEVEMENT_DEFINITIONS) {
    if (unlockedKeys.has(definition.key)) {
      continue;
    }

    if (definition.isUnlocked(stats, personalRecordCount)) {
      const unlocked = await unlockAchievement(supabase, userId, definition.key);

      if (unlocked) {
        newlyUnlocked.push(unlocked);
      }
    }
  }

  return newlyUnlocked;
}

export async function recordSessionCompletionEffects(
  supabase: RequestSupabaseClient,
  userId: string,
  session: WorkoutSession,
) {
  const { data: exercises, error } = await supabase
    .from('workout_session_exercises')
    .select('*')
    .eq('session_id', session.id)
    .returns<WorkoutSessionExercise[]>();

  throwIfSupabaseError(error, 'Failed to fetch session exercises for progress tracking.');

  const sessionExercises = exercises ?? [];

  await updateSessionAggregates(supabase, session, sessionExercises);
  await recomputeUserStatistics(supabase, userId);

  const newPersonalRecords = await detectPersonalRecords(
    supabase,
    userId,
    session.id,
    sessionExercises,
  );
  const newAchievements = await detectNewAchievements(supabase, userId);

  return { newPersonalRecords, newAchievements };
}
