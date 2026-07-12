export interface BodyProgressVisionTag {
  name: string;
  prob: number;
}

export type BodyCategoryKey =
  | 'definicion_muscular'
  | 'volumen_muscular'
  | 'abdomen'
  | 'brazos'
  | 'hombros'
  | 'pecho'
  | 'espalda'
  | 'piernas'
  | 'postura'
  | 'simetria';

export type BodyCategoryTrend =
  | 'incremento'
  | 'incremento_leve'
  | 'reduccion'
  | 'reduccion_leve'
  | 'sin_cambio'
  | 'no_visible';

export interface BodyCategoryComparison {
  visible: boolean;
  trend: BodyCategoryTrend;
  note: string;
}

export type BodyChangeLevel = 'leve' | 'moderado' | 'alto';

export type SamePersonCheck =
  | 'consistente'
  | 'personas_multiples'
  | 'sin_persona_detectada'
  | 'no_disponible';

export type ComparisonMethod = 'vision_llm' | 'tag_heuristic';

export interface BodyProgressEntry {
  id: string;
  user_id: string;
  source_image_path: string;
  source_image_content_type: string;
  ximilar_tagging_model: string;
  ximilar_person_model: string;
  detected_tags: BodyProgressVisionTag[];
  person_count: number;
  body_focus_tags: string[];
  posture_inferred?: string;
  visible_body_zones?: string[];
  compared_to_entry_id: string | null;
  is_baseline: boolean;
  same_person_check?: SamePersonCheck;
  same_person_note?: string;
  category_comparison?: Record<BodyCategoryKey, BodyCategoryComparison>;
  overall_change_level?: BodyChangeLevel | null;
  progress_summary?: string;
  observations?: string[];
  reliability_warning?: string | null;
  next_capture_recommendations?: string[];
  measurement_disclaimer?: string;
  comparison_method?: ComparisonMethod | null;
  ximilar_tagging_response: unknown;
  ximilar_person_response: unknown;
  created_at: string;
}

export interface BodyProgressEntryResponse extends BodyProgressEntry {
  source_image_url: string | null;
  compared_to_image_url?: string | null;
}
