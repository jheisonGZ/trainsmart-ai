export type PersonalRecordType = 'max_weight' | 'max_volume_session' | 'max_reps';

export interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_name: string;
  record_type: PersonalRecordType;
  value: number;
  previous_value: number | null;
  session_id: string | null;
  achieved_at: string;
  updated_at: string;
}
