export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface AuthMeResponse {
  user_id: string;
  email: string;
  provider?: string;
  has_profile: boolean;
  has_health_history: boolean;
  profile_completed: boolean;
  health_completed: boolean;
  profile_confirmed: boolean;
}

export type Sex = "male" | "female" | "other" | "prefer_not_say";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type Goal =
  | "lose_fat"
  | "gain_muscle"
  | "strength"
  | "general_fitness"
  | "mobility";

export interface ProfileRecord {
  user_id: string;
  name: string | null;
  birth_date: string | null;
  age: number | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  experience_level: ExperienceLevel | null;
  goal: Goal | null;
  days_per_week: number | null;
  time_per_session: number | null;
  bmi: number | null;
  bmi_category: string | null;
  completed: boolean;
  profile_confirmed: boolean;
  confirmed_at: string | null;
  email: string | null;
  avatar_url: string | null;
  auth_provider: string | null;
  auth_providers: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface HealthHistoryRecord {
  user_id: string;
  injuries: string[] | null;
  joint_problems: string[] | null;
  conditions: string[] | null;
  limitations: string[] | null;
  notes: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Routine {
  id: string;
  user_id: string;
  title: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}

export interface RoutineLlmExercise {
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number | null;
  rpe: number | null;
  tempo: string | null;
  notes: string | null;
}

export interface RoutineLlmDay {
  day_index: number;
  day_label: string;
  warmup_notes: string;
  cooldown_notes: string;
  exercises: RoutineLlmExercise[];
}

export interface RoutineLlmOutput {
  title: string;
  summary: string;
  safety_warnings: string[];
  weekly_plan: RoutineLlmDay[];
}

export interface RoutineVersion {
  id: string;
  routine_id: string;
  version_number: number;
  generation_reason: "initial" | "regenerate";
  model_provider: string | null;
  model_name: string | null;
  prompt_version: string | null;
  temperature: number | null;
  context_snapshot: unknown;
  llm_output: RoutineLlmOutput;
  safety_warnings: string | null;
  approval_status: "proposed" | "approved" | "discarded";
  approved_at: string | null;
  created_at: string;
}

export interface RoutineDay {
  id: string;
  routine_version_id: string;
  day_index: number;
  day_label: string;
  warmup_notes: string | null;
  cooldown_notes: string | null;
  created_at: string;
}

export interface RoutineDayExercise {
  id: string;
  routine_day_id: string;
  exercise_id: string | null;
  exercise_name: string;
  exercise_order: number;
  sets: number;
  reps: string;
  rest_seconds: number | null;
  rpe: number | null;
  tempo: string | null;
  notes: string | null;
  created_at: string;
}

export interface RoutineDashboardDay extends RoutineDay {
  exercises: RoutineDayExercise[];
}

export interface RoutineDashboardResponse {
  routine: Routine;
  version: RoutineVersion;
  days: RoutineDashboardDay[];
  suggested_day_index: number;
}

export interface RoutineTodayResponse {
  routine: Routine;
  version: RoutineVersion;
  today: RoutineDashboardDay;
  requested_day_index: number;
  actual_day_index: number;
  today_status: "available" | "in_progress" | "completed";
  completed_at: string | null;
  next_day: RoutineDashboardDay | null;
  completed_day_count: number;
  total_day_count: number;
  active_session_id: string | null;
}

export interface RoutineMutationResponse {
  routine: Routine;
  version: RoutineVersion;
  message: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  routine_version_id: string | null;
  routine_day_id: string | null;
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
  perceived_effort: "easy" | "moderate" | "hard" | null;
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

export interface WorkoutSessionDetail extends WorkoutSession {
  exercises: WorkoutSessionExercise[];
}

export interface ProgressStatsResponse {
  total_sessions: number;
  sessions_per_week: Array<{ week: string; count: number }>;
  current_streak: number;
  weekly_consistency: number;
  top_exercises: Array<{ exercise_name: string; count: number }>;
  weight_progression: Array<{
    exercise_name: string;
    data: Array<{ date: string; weight: number }>;
  }>;
}
