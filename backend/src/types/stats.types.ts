export interface WeeklySessionCount {
  week: string;
  count: number;
}

export interface ExerciseFrequency {
  exercise_name: string;
  count: number;
}

export interface ExerciseWeightSeries {
  exercise_name: string;
  data: Array<{
    date: string;
    weight: number;
  }>;
}

export interface StatsResponse {
  total_sessions: number;
  sessions_per_week: WeeklySessionCount[];
  current_streak: number;
  weekly_consistency: number;
  top_exercises: ExerciseFrequency[];
  weight_progression: ExerciseWeightSeries[];
}
