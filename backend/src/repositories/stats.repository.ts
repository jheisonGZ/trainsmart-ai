import type { RequestSupabaseClient } from '../lib/supabase/request';
import { throwIfSupabaseError } from '../lib/supabase/errors';
import type { StatsResponse } from '../types/stats.types';
import { getIsoDate, getWeekStart } from '../utils/dates';

export async function getUserProgressStats(
  supabase: RequestSupabaseClient,
  userId: string,
  weeks = 8,
): Promise<StatsResponse> {
  const { count, error: countError } = await supabase
    .from('workout_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  throwIfSupabaseError(countError, 'Failed to count workout sessions.');

  const weeksAgo = new Date();
  weeksAgo.setUTCDate(weeksAgo.getUTCDate() - weeks * 7);

  const { data: recentSessions, error: recentError } = await supabase
    .from('workout_sessions')
    .select('session_date')
    .eq('user_id', userId)
    .gte('session_date', getIsoDate(weeksAgo))
    .order('session_date', { ascending: true })
    .returns<Array<{ session_date: string }>>();

  throwIfSupabaseError(recentError, 'Failed to fetch recent workout sessions.');

  const weekMap = new Map<string, number>();

  for (const session of recentSessions ?? []) {
    const weekKey = getIsoDate(getWeekStart(new Date(`${session.session_date}T00:00:00Z`)));
    weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + 1);
  }

  const sessions_per_week = Array.from({ length: weeks }).map((_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (weeks - index - 1) * 7);
    const week = getIsoDate(getWeekStart(date));

    return {
      week,
      count: weekMap.get(week) ?? 0,
    };
  });

  const { data: streakSessions, error: streakError } = await supabase
    .from('workout_sessions')
    .select('session_date')
    .eq('user_id', userId)
    .order('session_date', { ascending: false })
    .limit(365)
    .returns<Array<{ session_date: string }>>();

  throwIfSupabaseError(streakError, 'Failed to compute current streak.');

  let current_streak = 0;

  if ((streakSessions ?? []).length > 0) {
    const uniqueDates = Array.from(
      new Set((streakSessions ?? []).map((session) => session.session_date)),
    );
    const today = getIsoDate();
    const yesterday = getIsoDate(new Date(Date.now() - 86400000));

    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      current_streak = 1;
      let previousDate = new Date(`${uniqueDates[0]}T00:00:00Z`);

      for (let index = 1; index < uniqueDates.length; index += 1) {
        const currentDate = new Date(`${uniqueDates[index]}T00:00:00Z`);
        const differenceInDays = Math.floor(
          (previousDate.getTime() - currentDate.getTime()) / 86400000,
        );

        if (differenceInDays !== 1) {
          break;
        }

        current_streak += 1;
        previousDate = currentDate;
      }
    }
  }

  const currentWeekKey = getIsoDate(getWeekStart(new Date()));
  const currentWeekSessions = weekMap.get(currentWeekKey) ?? 0;
  const weekly_consistency = Math.min(100, Math.round((currentWeekSessions / 3) * 100));

  const { data: allSessions, error: allSessionsError } = await supabase
    .from('workout_sessions')
    .select('id, session_date')
    .eq('user_id', userId)
    .returns<Array<{ id: string; session_date: string }>>();

  throwIfSupabaseError(allSessionsError, 'Failed to fetch sessions for progress charts.');

  const sessionDateById = new Map((allSessions ?? []).map((session) => [session.id, session.session_date]));
  const sessionIds = (allSessions ?? []).map((session) => session.id);

  let top_exercises: StatsResponse['top_exercises'] = [];
  let weight_progression: StatsResponse['weight_progression'] = [];

  if (sessionIds.length > 0) {
    const { data: exerciseRows, error: exerciseRowsError } = await supabase
      .from('workout_session_exercises')
      .select('session_id, exercise_name, weight_kg')
      .in('session_id', sessionIds)
      .returns<Array<{ session_id: string; exercise_name: string; weight_kg: number | null }>>();

    throwIfSupabaseError(exerciseRowsError, 'Failed to fetch session exercises for stats.');

    const exerciseCounts = new Map<string, number>();
    const groupedWeights = new Map<string, Array<{ date: string; weight: number }>>();

    for (const row of exerciseRows ?? []) {
      exerciseCounts.set(row.exercise_name, (exerciseCounts.get(row.exercise_name) ?? 0) + 1);

      if (typeof row.weight_kg === 'number') {
        const sessionDate = sessionDateById.get(row.session_id);

        if (sessionDate) {
          const entries = groupedWeights.get(row.exercise_name) ?? [];
          entries.push({
            date: sessionDate,
            weight: row.weight_kg,
          });
          groupedWeights.set(row.exercise_name, entries);
        }
      }
    }

    top_exercises = Array.from(exerciseCounts.entries())
      .map(([exercise_name, countValue]) => ({
        exercise_name,
        count: countValue,
      }))
      .sort((left, right) => right.count - left.count || left.exercise_name.localeCompare(right.exercise_name))
      .slice(0, 10);

    weight_progression = Array.from(groupedWeights.entries())
      .map(([exercise_name, data]) => ({
        exercise_name,
        data: [...data]
          .sort((left, right) => left.date.localeCompare(right.date))
          .slice(-10),
      }))
      .filter((entry) => entry.data.length >= 2)
      .slice(0, 5);
  }

  return {
    total_sessions: count ?? 0,
    sessions_per_week,
    current_streak,
    weekly_consistency,
    top_exercises,
    weight_progression,
  };
}
