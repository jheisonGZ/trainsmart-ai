export interface HealthHistory {
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

export interface BodyMetric {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  bmi: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arm_cm: number | null;
  leg_cm: number | null;
  hip_cm: number | null;
  neck_cm: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  notes: string | null;
  created_at: string;
}
