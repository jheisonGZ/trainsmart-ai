-- Nutrition vision: add protein_strength and portion_detail
ALTER TABLE public.meal_analyses
  ADD COLUMN IF NOT EXISTS protein_strength text,
  ADD COLUMN IF NOT EXISTS portion_detail text;

-- Body progress: add posture_inferred, visible_body_zones, change_summary
ALTER TABLE public.body_progress_entries
  ADD COLUMN IF NOT EXISTS posture_inferred text,
  ADD COLUMN IF NOT EXISTS visible_body_zones text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS change_summary text;
