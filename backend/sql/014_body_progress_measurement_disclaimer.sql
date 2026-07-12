-- Fix: measurement_disclaimer was used by the service but missed in migration 013.
ALTER TABLE public.body_progress_entries
  ADD COLUMN IF NOT EXISTS measurement_disclaimer text;
