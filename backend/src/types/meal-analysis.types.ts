export interface MealAnalysis {
  id: string;
  user_id: string;
  image_storage_path: string;
  food_names: string[];
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  raw_response: unknown;
  created_at: string;
}
