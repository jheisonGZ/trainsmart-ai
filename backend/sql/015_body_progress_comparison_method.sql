-- Track which engine produced the category comparison (vision LLM vs tag heuristic fallback).
ALTER TABLE public.body_progress_entries
  ADD COLUMN IF NOT EXISTS comparison_method text;
