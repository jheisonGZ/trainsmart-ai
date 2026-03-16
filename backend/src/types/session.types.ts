export type PerceivedEffort = 'easy' | 'moderate' | 'hard';

export interface WorkoutSession {
  id: string;
  user_id: string;
  routine_version_id: string | null;
  routine_day_id: string | null;
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
  perceived_effort: PerceivedEffort | null;
  difficulty_rating: number | null;
  pain_or_discomfort: boolean | null;
  notes: string | null;
  created_at: string;
}

export interface WorkoutSessionExercise {
  id: string;
  session_id: string;
  exercise_id: string | null;
  exercise_name: string;
  exercise_order: number;
  planned_sets: number | null;
  planned_reps: string | null;
  performed_sets: number | null;
  performed_reps: string | null;
  weight_kg: number | null;
  rest_seconds: number | null;
  created_at: string;
}
