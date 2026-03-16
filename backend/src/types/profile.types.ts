export type Sex = 'male' | 'female' | 'other' | 'prefer_not_say';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type Goal = 'lose_fat' | 'gain_muscle' | 'strength' | 'general_fitness' | 'mobility';

export interface Profile {
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
