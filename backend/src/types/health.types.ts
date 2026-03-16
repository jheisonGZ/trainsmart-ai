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
  notes: string | null;
  created_at: string;
}
