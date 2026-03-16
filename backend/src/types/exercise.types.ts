export type Muscle =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'full_body'
  | 'cardio'
  | 'mobility'
  | 'other';

export type Equipment =
  | 'none'
  | 'dumbbells'
  | 'barbell'
  | 'machine'
  | 'cables'
  | 'bands'
  | 'kettlebell'
  | 'other';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type MediaType = 'image' | 'video' | 'link';

export interface Exercise {
  id: string;
  name: string;
  primary_muscle: Muscle;
  equipment: Equipment;
  difficulty: Difficulty;
  description: string | null;
  safety_tips: string | null;
  contraindications: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExerciseMedia {
  id: string;
  exercise_id: string;
  media_type: MediaType;
  url: string;
  caption: string | null;
  created_at: string;
}
