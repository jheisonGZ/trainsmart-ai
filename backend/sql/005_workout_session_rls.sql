-- Ensure authenticated users can persist the lifecycle of their own workout sessions.
-- Run this in Supabase SQL Editor if your project has RLS enabled on these tables.

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_session_exercises ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workout_sessions'
      AND policyname = 'workout_sessions_select_own'
  ) THEN
    CREATE POLICY workout_sessions_select_own
      ON public.workout_sessions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workout_sessions'
      AND policyname = 'workout_sessions_insert_own'
  ) THEN
    CREATE POLICY workout_sessions_insert_own
      ON public.workout_sessions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workout_sessions'
      AND policyname = 'workout_sessions_update_own'
  ) THEN
    CREATE POLICY workout_sessions_update_own
      ON public.workout_sessions
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workout_sessions'
      AND policyname = 'workout_sessions_delete_own'
  ) THEN
    CREATE POLICY workout_sessions_delete_own
      ON public.workout_sessions
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workout_session_exercises'
      AND policyname = 'workout_session_exercises_select_own'
  ) THEN
    CREATE POLICY workout_session_exercises_select_own
      ON public.workout_session_exercises
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.workout_sessions ws
          WHERE ws.id = workout_session_exercises.session_id
            AND ws.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workout_session_exercises'
      AND policyname = 'workout_session_exercises_insert_own'
  ) THEN
    CREATE POLICY workout_session_exercises_insert_own
      ON public.workout_session_exercises
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.workout_sessions ws
          WHERE ws.id = workout_session_exercises.session_id
            AND ws.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workout_session_exercises'
      AND policyname = 'workout_session_exercises_update_own'
  ) THEN
    CREATE POLICY workout_session_exercises_update_own
      ON public.workout_session_exercises
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.workout_sessions ws
          WHERE ws.id = workout_session_exercises.session_id
            AND ws.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.workout_sessions ws
          WHERE ws.id = workout_session_exercises.session_id
            AND ws.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workout_session_exercises'
      AND policyname = 'workout_session_exercises_delete_own'
  ) THEN
    CREATE POLICY workout_session_exercises_delete_own
      ON public.workout_session_exercises
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.workout_sessions ws
          WHERE ws.id = workout_session_exercises.session_id
            AND ws.user_id = auth.uid()
        )
      );
  END IF;
END $$;
