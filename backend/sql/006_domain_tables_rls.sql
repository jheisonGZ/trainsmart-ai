-- Domain-table RLS policies required when the backend queries Supabase
-- using the caller's bearer token instead of a service-role key.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_day_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_media ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_own'
  ) THEN
    CREATE POLICY profiles_select_own
      ON public.profiles
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_insert_own'
  ) THEN
    CREATE POLICY profiles_insert_own
      ON public.profiles
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY profiles_update_own
      ON public.profiles
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'health_history' AND policyname = 'health_history_select_own'
  ) THEN
    CREATE POLICY health_history_select_own
      ON public.health_history
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'health_history' AND policyname = 'health_history_insert_own'
  ) THEN
    CREATE POLICY health_history_insert_own
      ON public.health_history
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'health_history' AND policyname = 'health_history_update_own'
  ) THEN
    CREATE POLICY health_history_update_own
      ON public.health_history
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'body_metrics' AND policyname = 'body_metrics_select_own'
  ) THEN
    CREATE POLICY body_metrics_select_own
      ON public.body_metrics
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'body_metrics' AND policyname = 'body_metrics_insert_own'
  ) THEN
    CREATE POLICY body_metrics_insert_own
      ON public.body_metrics
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'body_metrics' AND policyname = 'body_metrics_update_own'
  ) THEN
    CREATE POLICY body_metrics_update_own
      ON public.body_metrics
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routines' AND policyname = 'routines_select_own'
  ) THEN
    CREATE POLICY routines_select_own
      ON public.routines
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routines' AND policyname = 'routines_insert_own'
  ) THEN
    CREATE POLICY routines_insert_own
      ON public.routines
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routines' AND policyname = 'routines_update_own'
  ) THEN
    CREATE POLICY routines_update_own
      ON public.routines
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routine_versions' AND policyname = 'routine_versions_select_own'
  ) THEN
    CREATE POLICY routine_versions_select_own
      ON public.routine_versions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.routines r
          WHERE r.id = routine_versions.routine_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routine_versions' AND policyname = 'routine_versions_insert_own'
  ) THEN
    CREATE POLICY routine_versions_insert_own
      ON public.routine_versions
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.routines r
          WHERE r.id = routine_versions.routine_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routine_versions' AND policyname = 'routine_versions_update_own'
  ) THEN
    CREATE POLICY routine_versions_update_own
      ON public.routine_versions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.routines r
          WHERE r.id = routine_versions.routine_id
            AND r.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.routines r
          WHERE r.id = routine_versions.routine_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routine_days' AND policyname = 'routine_days_select_own'
  ) THEN
    CREATE POLICY routine_days_select_own
      ON public.routine_days
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.routine_versions rv
          JOIN public.routines r ON r.id = rv.routine_id
          WHERE rv.id = routine_days.routine_version_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routine_days' AND policyname = 'routine_days_insert_own'
  ) THEN
    CREATE POLICY routine_days_insert_own
      ON public.routine_days
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.routine_versions rv
          JOIN public.routines r ON r.id = rv.routine_id
          WHERE rv.id = routine_days.routine_version_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routine_days' AND policyname = 'routine_days_update_own'
  ) THEN
    CREATE POLICY routine_days_update_own
      ON public.routine_days
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.routine_versions rv
          JOIN public.routines r ON r.id = rv.routine_id
          WHERE rv.id = routine_days.routine_version_id
            AND r.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.routine_versions rv
          JOIN public.routines r ON r.id = rv.routine_id
          WHERE rv.id = routine_days.routine_version_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routine_day_exercises' AND policyname = 'routine_day_exercises_select_own'
  ) THEN
    CREATE POLICY routine_day_exercises_select_own
      ON public.routine_day_exercises
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.routine_days rd
          JOIN public.routine_versions rv ON rv.id = rd.routine_version_id
          JOIN public.routines r ON r.id = rv.routine_id
          WHERE rd.id = routine_day_exercises.routine_day_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routine_day_exercises' AND policyname = 'routine_day_exercises_insert_own'
  ) THEN
    CREATE POLICY routine_day_exercises_insert_own
      ON public.routine_day_exercises
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.routine_days rd
          JOIN public.routine_versions rv ON rv.id = rd.routine_version_id
          JOIN public.routines r ON r.id = rv.routine_id
          WHERE rd.id = routine_day_exercises.routine_day_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'routine_day_exercises' AND policyname = 'routine_day_exercises_update_own'
  ) THEN
    CREATE POLICY routine_day_exercises_update_own
      ON public.routine_day_exercises
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.routine_days rd
          JOIN public.routine_versions rv ON rv.id = rd.routine_version_id
          JOIN public.routines r ON r.id = rv.routine_id
          WHERE rd.id = routine_day_exercises.routine_day_id
            AND r.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.routine_days rd
          JOIN public.routine_versions rv ON rv.id = rd.routine_version_id
          JOIN public.routines r ON r.id = rv.routine_id
          WHERE rd.id = routine_day_exercises.routine_day_id
            AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exercises' AND policyname = 'exercises_select_authenticated'
  ) THEN
    CREATE POLICY exercises_select_authenticated
      ON public.exercises
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'exercise_media' AND policyname = 'exercise_media_select_authenticated'
  ) THEN
    CREATE POLICY exercise_media_select_authenticated
      ON public.exercise_media
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;
