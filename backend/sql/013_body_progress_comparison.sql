-- Body progress: rework tracking into structured baseline/comparison model.
-- Old free-text columns become optional (kept for backward compatibility with
-- rows created before this migration); new structured columns are added for
-- the category-by-category comparison feature.

ALTER TABLE public.body_progress_entries
  ALTER COLUMN entry_summary DROP NOT NULL,
  ALTER COLUMN comparison_summary DROP NOT NULL,
  ALTER COLUMN comparison_notes DROP NOT NULL;

ALTER TABLE public.body_progress_entries
  ADD COLUMN IF NOT EXISTS is_baseline boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS same_person_check text,
  ADD COLUMN IF NOT EXISTS same_person_note text,
  ADD COLUMN IF NOT EXISTS category_comparison jsonb,
  ADD COLUMN IF NOT EXISTS overall_change_level text,
  ADD COLUMN IF NOT EXISTS progress_summary text,
  ADD COLUMN IF NOT EXISTS observations text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reliability_warning text,
  ADD COLUMN IF NOT EXISTS next_capture_recommendations text[] DEFAULT '{}';
