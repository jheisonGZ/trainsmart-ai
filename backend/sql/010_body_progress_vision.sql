CREATE TABLE IF NOT EXISTS public.body_progress_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_image_path text NOT NULL,
  source_image_content_type text NOT NULL,
  ximilar_tagging_model text NOT NULL,
  ximilar_person_model text NOT NULL,
  detected_tags jsonb NOT NULL,
  person_count integer NOT NULL DEFAULT 0,
  quality_warnings text[] NOT NULL DEFAULT '{}',
  body_focus_tags text[] NOT NULL DEFAULT '{}',
  entry_summary text NOT NULL,
  comparison_summary text NOT NULL,
  comparison_notes text NOT NULL,
  compared_to_entry_id uuid REFERENCES public.body_progress_entries(id) ON DELETE SET NULL,
  ximilar_tagging_response jsonb NOT NULL,
  ximilar_person_response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_body_progress_entries_user_id
  ON public.body_progress_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_body_progress_entries_created_at
  ON public.body_progress_entries(created_at DESC);

ALTER TABLE public.body_progress_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'body_progress_entries'
      AND policyname = 'body_progress_entries_select_own'
  ) THEN
    CREATE POLICY body_progress_entries_select_own
      ON public.body_progress_entries
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'body_progress_entries'
      AND policyname = 'body_progress_entries_insert_own'
  ) THEN
    CREATE POLICY body_progress_entries_insert_own
      ON public.body_progress_entries
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('body-progress-images-private', 'body-progress-images-private', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'body_progress_images_select_own'
  ) THEN
    CREATE POLICY body_progress_images_select_own
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'body-progress-images-private'
        AND auth.uid()::text = split_part(name, '/', 2)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'body_progress_images_insert_own'
  ) THEN
    CREATE POLICY body_progress_images_insert_own
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'body-progress-images-private'
        AND auth.uid()::text = split_part(name, '/', 2)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'body_progress_images_update_own'
  ) THEN
    CREATE POLICY body_progress_images_update_own
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'body-progress-images-private'
        AND auth.uid()::text = split_part(name, '/', 2)
      )
      WITH CHECK (
        bucket_id = 'body-progress-images-private'
        AND auth.uid()::text = split_part(name, '/', 2)
      );
  END IF;
END $$;
