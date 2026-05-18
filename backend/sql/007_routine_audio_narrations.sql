CREATE TABLE IF NOT EXISTS public.routine_audio_narrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  routine_version_id uuid REFERENCES public.routine_versions(id) ON DELETE SET NULL,
  workout_session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  day_index integer,
  provider text NOT NULL DEFAULT 'elevenlabs',
  voice_id text NOT NULL,
  model_id text NOT NULL,
  narration_text text NOT NULL,
  audio_storage_path text NOT NULL,
  output_format text NOT NULL,
  character_count integer NOT NULL CHECK (character_count > 0),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'locked', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_routine_audio_narrations_user_id
  ON public.routine_audio_narrations(user_id);

CREATE INDEX IF NOT EXISTS idx_routine_audio_narrations_session_id
  ON public.routine_audio_narrations(workout_session_id);

CREATE INDEX IF NOT EXISTS idx_routine_audio_narrations_routine_id
  ON public.routine_audio_narrations(routine_id);

CREATE INDEX IF NOT EXISTS idx_routine_audio_narrations_status
  ON public.routine_audio_narrations(status);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_routine_audio_available_session
  ON public.routine_audio_narrations(workout_session_id)
  WHERE status = 'available' AND deleted_at IS NULL;

ALTER TABLE public.routine_audio_narrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'routine_audio_narrations'
      AND policyname = 'routine_audio_select_own'
  ) THEN
    CREATE POLICY routine_audio_select_own
      ON public.routine_audio_narrations
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'routine_audio_narrations'
      AND policyname = 'routine_audio_insert_own'
  ) THEN
    CREATE POLICY routine_audio_insert_own
      ON public.routine_audio_narrations
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'routine_audio_narrations'
      AND policyname = 'routine_audio_update_own'
  ) THEN
    CREATE POLICY routine_audio_update_own
      ON public.routine_audio_narrations
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('routine-audio-private', 'routine-audio-private', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'routine_audio_objects_select_own'
  ) THEN
    CREATE POLICY routine_audio_objects_select_own
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'routine-audio-private'
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
      AND policyname = 'routine_audio_objects_insert_own'
  ) THEN
    CREATE POLICY routine_audio_objects_insert_own
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'routine-audio-private'
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
      AND policyname = 'routine_audio_objects_update_own'
  ) THEN
    CREATE POLICY routine_audio_objects_update_own
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'routine-audio-private'
        AND auth.uid()::text = split_part(name, '/', 2)
      )
      WITH CHECK (
        bucket_id = 'routine-audio-private'
        AND auth.uid()::text = split_part(name, '/', 2)
      );
  END IF;
END $$;
