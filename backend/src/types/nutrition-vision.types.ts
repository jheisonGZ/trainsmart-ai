export interface NutritionVisionTag {
  name: string;
  prob: number;
}

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
  missing_components?: string[];
  portion_estimate?: string;
  protein_strength?: string;
  portion_detail?: string;
  practical_tip?: string;
  ximilar_response: unknown;
  created_at: string;
}

export interface MealAnalysisResponse extends MealAnalysis {
  source_image_url: string | null;
}
