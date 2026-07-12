export interface NutritionVisionTag {
  name: string;
  prob: number;
}

export type FoodGroupKey = 'proteina' | 'carbohidratos' | 'vegetales' | 'fruta' | 'grasas';

export type FoodGroupAssessment = 'excelente' | 'adecuado' | 'escaso' | 'no_identificable';

export interface MealAnalysis {
  id: string;
  user_id: string;
  source_image_path: string;
  source_image_content_type: string;
  ximilar_model: string;
  detected_tags: NutritionVisionTag[];
  detected_food_groups: string[];
  summary: string;
  educational_feedback: string;
  goal_alignment: string;
  balance_assessment?: string;
  category_assessment?: Record<FoodGroupKey, FoodGroupAssessment>;
  balance_score?: number;
  balance_score_note?: string;
  recommendations?: string[];
  uncertainty_notes?: string[];
  disclaimer?: string;
  ximilar_response: unknown;
  created_at: string;
}

export interface MealAnalysisResponse extends MealAnalysis {
  source_image_url: string | null;
}
