import type { HealthHistory } from './health.types';
import type { Profile } from './profile.types';

export type RoutineStatus = 'active' | 'archived';
export type GenerationReason = 'initial' | 'regenerate';
export type RoutineApprovalStatus = 'proposed' | 'approved' | 'discarded';

export interface Routine {
  id: string;
  user_id: string;
  title: string;
  status: RoutineStatus;
  created_at: string;
  updated_at: string;
}

export interface RoutineVersion {
  id: string;
  routine_id: string;
  version_number: number;
  generation_reason: GenerationReason;
  model_provider: string | null;
  model_name: string | null;
  prompt_version: string | null;
  temperature: number | null;
  context_snapshot: ContextSnapshot;
  llm_output: RoutineLlmOutput;
  safety_warnings: string | null;
  approval_status: RoutineApprovalStatus;
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

export interface ContextSnapshot {
  profile: Partial<Profile>;
  health: Partial<HealthHistory>;
  latest_metrics: {
    id?: string;
    measured_at?: string;
    weight_kg?: number | null;
    height_cm?: number | null;
    bmi?: number | null;
    notes?: string | null;
  } | null;
  feedback_summary: string | null;
}

export interface RoutineLlmExercise {
  exercise_name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
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

export interface RoutineWithVersion {
  routine: Routine;
  version: RoutineVersion;
}

export interface RoutineDashboardDay extends RoutineDay {
  exercises: RoutineDayExercise[];
}

export type RoutineTodayStatus = 'available' | 'in_progress' | 'completed';

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
  today_status: RoutineTodayStatus;
  completed_at: string | null;
  next_day: RoutineDashboardDay | null;
  completed_day_count: number;
  total_day_count: number;
  active_session_id: string | null;
}
