export interface BodyProgressVisionTag {
  name: string;
  prob: number;
}

export interface BodyProgressEntry {
  id: string;
  user_id: string;
  source_image_path: string;
  source_image_content_type: string;
  ximilar_tagging_model: string;
  ximilar_person_model: string;
  detected_tags: BodyProgressVisionTag[];
  person_count: number;
  quality_warnings: string[];
  body_focus_tags: string[];
  entry_summary: string;
  comparison_summary: string;
  comparison_notes: string;
  compared_to_entry_id: string | null;
  ximilar_tagging_response: unknown;
  ximilar_person_response: unknown;
  created_at: string;
}

export interface BodyProgressEntryResponse extends BodyProgressEntry {
  source_image_url: string | null;
}
