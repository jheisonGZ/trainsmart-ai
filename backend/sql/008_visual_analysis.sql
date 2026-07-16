CREATE TABLE IF NOT EXISTS public.meal_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_storage_path text NOT NULL,
  food_names text[] NOT NULL DEFAULT '{}',
  calories numeric(7,2),
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.body_progress_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_storage_path text NOT NULL,
  analysis_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.environment_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_storage_path text NOT NULL,
  equipment_detected text[] NOT NULL DEFAULT '{}',
  analysis_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_analyses_user_id ON public.meal_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_body_progress_analyses_user_id ON public.body_progress_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_environment_analyses_user_id ON public.environment_analyses(user_id);

ALTER TABLE public.meal_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_progress_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environment_analyses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'meal_analyses' AND policyname = 'meal_analyses_select_own'
  ) THEN
    CREATE POLICY meal_analyses_select_own ON public.meal_analyses
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'meal_analyses' AND policyname = 'meal_analyses_insert_own'
  ) THEN
    CREATE POLICY meal_analyses_insert_own ON public.meal_analyses
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'body_progress_analyses' AND policyname = 'body_progress_analyses_select_own'
  ) THEN
    CREATE POLICY body_progress_analyses_select_own ON public.body_progress_analyses
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'body_progress_analyses' AND policyname = 'body_progress_analyses_insert_own'
  ) THEN
    CREATE POLICY body_progress_analyses_insert_own ON public.body_progress_analyses
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'environment_analyses' AND policyname = 'environment_analyses_select_own'
  ) THEN
    CREATE POLICY environment_analyses_select_own ON public.environment_analyses
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'environment_analyses' AND policyname = 'environment_analyses_insert_own'
  ) THEN
    CREATE POLICY environment_analyses_insert_own ON public.environment_analyses
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('meal-images-private', 'meal-images-private', false),
  ('body-progress-images-private', 'body-progress-images-private', false),
  ('environment-images-private', 'environment-images-private', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DO $$
DECLARE
  bucket_name text;
BEGIN
  FOREACH bucket_name IN ARRAY ARRAY['meal-images-private', 'body-progress-images-private', 'environment-images-private']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname = bucket_name || '_select_own'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects FOR SELECT USING (bucket_id = %L AND auth.uid()::text = split_part(name, ''/'', 2))',
        bucket_name || '_select_own', bucket_name
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname = bucket_name || '_insert_own'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON storage.objects FOR INSERT WITH CHECK (bucket_id = %L AND auth.uid()::text = split_part(name, ''/'', 2))',
        bucket_name || '_insert_own', bucket_name
      );
    END IF;
  END LOOP;
END $$;
