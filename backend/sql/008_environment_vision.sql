CREATE TABLE IF NOT EXISTS public.environment_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_image_path text NOT NULL,
  source_image_content_type text NOT NULL,
  ximilar_model text NOT NULL,
  detected_tags jsonb NOT NULL,
  detected_equipment text[] NOT NULL DEFAULT '{}',
  detected_space_tags text[] NOT NULL DEFAULT '{}',
  summary text NOT NULL,
  training_context text NOT NULL,
  ximilar_response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_environment_analyses_user_id
  ON public.environment_analyses(user_id);

CREATE INDEX IF NOT EXISTS idx_environment_analyses_created_at
  ON public.environment_analyses(created_at DESC);

ALTER TABLE public.environment_analyses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'environment_analyses'
      AND policyname = 'environment_analyses_select_own'
  ) THEN
    CREATE POLICY environment_analyses_select_own
      ON public.environment_analyses
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'environment_analyses'
      AND policyname = 'environment_analyses_insert_own'
  ) THEN
    CREATE POLICY environment_analyses_insert_own
      ON public.environment_analyses
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('environment-images-private', 'environment-images-private', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'environment_images_select_own'
  ) THEN
    CREATE POLICY environment_images_select_own
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'environment-images-private'
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
      AND policyname = 'environment_images_insert_own'
  ) THEN
    CREATE POLICY environment_images_insert_own
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'environment-images-private'
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
      AND policyname = 'environment_images_update_own'
  ) THEN
    CREATE POLICY environment_images_update_own
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'environment-images-private'
        AND auth.uid()::text = split_part(name, '/', 2)
      )
      WITH CHECK (
        bucket_id = 'environment-images-private'
        AND auth.uid()::text = split_part(name, '/', 2)
      );
  END IF;
END $$;
