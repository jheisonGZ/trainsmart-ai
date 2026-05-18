export type RoutineAudioStatus = 'available' | 'locked' | 'deleted';

export interface RoutineAudioNarration {
  id: string;
  user_id: string;
  routine_id: string;
  routine_version_id: string | null;
  workout_session_id: string;
  day_index: number | null;
  provider: 'elevenlabs' | string;
  voice_id: string;
  model_id: string;
  narration_text: string;
  audio_storage_path: string;
  output_format: string;
  character_count: number;
  status: RoutineAudioStatus;
  created_at: string;
  locked_at: string | null;
  deleted_at: string | null;
}
