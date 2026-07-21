export interface UserStatistics {
  user_id: string;
  total_sessions: number;
  total_time_trained_seconds: number;
  total_volume_kg: number;
  total_sets: number;
  total_exercises_logged: number;
  current_streak_days: number;
  longest_streak_days: number;
  best_week_sessions: number;
  last_session_at: string | null;
  updated_at: string;
}
