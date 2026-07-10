export interface EnvironmentVisionTag {
  name: string;
  prob: number;
}

export interface EnvironmentAnalysis {
  id: string;
  user_id: string;
  source_image_path: string;
  source_image_content_type: string;
  ximilar_model: string;
  detected_tags: EnvironmentVisionTag[];
  detected_equipment: string[];
  detected_space_tags: string[];
  summary: string;
  training_context: string;
  ximilar_response: unknown;
  created_at: string;
}

export interface EnvironmentAnalysisResponse extends EnvironmentAnalysis {
  source_image_url: string | null;
  space_description: string;
  equipment_description: string;
}
