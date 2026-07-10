DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'environment_analyses'
      AND policyname = 'environment_analyses_delete_own'
  ) THEN
    CREATE POLICY environment_analyses_delete_own
      ON public.environment_analyses
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'environment_images_delete_own'
  ) THEN
    CREATE POLICY environment_images_delete_own
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'environment-images-private'
        AND auth.uid()::text = split_part(name, '/', 2)
      );
  END IF;
END $$;
