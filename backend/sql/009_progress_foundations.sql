-- Fase 1 de la arquitectura de progreso: agregados precalculados en sesiones,
-- medidas corporales ampliadas, y tres tablas nuevas (records, statistics,
-- achievements) que se llenan automáticamente al terminar una sesión.

-- 1. Ampliar body_metrics con medidas corporales adicionales.
ALTER TABLE public.body_metrics
  ADD COLUMN IF NOT EXISTS waist_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS chest_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS arm_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS leg_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS hip_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS neck_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS body_fat_pct numeric(4,2),
  ADD COLUMN IF NOT EXISTS muscle_mass_kg numeric(5,2);

-- 2. Agregados precalculados por sesión (se llenan una sola vez al terminar).
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS duration_seconds int,
  ADD COLUMN IF NOT EXISTS total_volume_kg numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_sets int,
  ADD COLUMN IF NOT EXISTS total_exercises int,
  ADD COLUMN IF NOT EXISTS calories_estimated numeric(7,2);

-- 3. user_id denormalizado + reps numéricas en workout_session_exercises.
ALTER TABLE public.workout_session_exercises
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS performed_reps_count int,
  ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;

UPDATE public.workout_session_exercises wse
SET user_id = ws.user_id
FROM public.workout_sessions ws
WHERE wse.session_id = ws.id AND wse.user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_session_exercises_user_exercise
  ON public.workout_session_exercises(user_id, exercise_name);

-- 4. Récords personales.
DO $$ BEGIN
  CREATE TYPE personal_record_type_enum AS ENUM ('max_weight', 'max_volume_session', 'max_reps');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  record_type personal_record_type_enum NOT NULL,
  value numeric(10,2) NOT NULL,
  previous_value numeric(10,2),
  session_id uuid REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_name, record_type)
);

CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON public.personal_records(user_id);

-- 5. Estadísticas resumen por usuario (evita recalcular todo en cada carga).
CREATE TABLE IF NOT EXISTS public.user_statistics (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_sessions int NOT NULL DEFAULT 0,
  total_time_trained_seconds bigint NOT NULL DEFAULT 0,
  total_volume_kg numeric(12,2) NOT NULL DEFAULT 0,
  total_sets int NOT NULL DEFAULT 0,
  total_exercises_logged int NOT NULL DEFAULT 0,
  current_streak_days int NOT NULL DEFAULT 0,
  longest_streak_days int NOT NULL DEFAULT 0,
  best_week_sessions int NOT NULL DEFAULT 0,
  last_session_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Logros desbloqueados (el catálogo de definiciones vive en código).
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);

-- RLS: mismo patrón que body_metrics/profiles en 006_domain_tables_rls.sql.
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'personal_records' AND policyname = 'personal_records_select_own'
  ) THEN
    CREATE POLICY personal_records_select_own ON public.personal_records
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'personal_records' AND policyname = 'personal_records_insert_own'
  ) THEN
    CREATE POLICY personal_records_insert_own ON public.personal_records
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'personal_records' AND policyname = 'personal_records_update_own'
  ) THEN
    CREATE POLICY personal_records_update_own ON public.personal_records
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_statistics' AND policyname = 'user_statistics_select_own'
  ) THEN
    CREATE POLICY user_statistics_select_own ON public.user_statistics
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_statistics' AND policyname = 'user_statistics_insert_own'
  ) THEN
    CREATE POLICY user_statistics_insert_own ON public.user_statistics
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_statistics' AND policyname = 'user_statistics_update_own'
  ) THEN
    CREATE POLICY user_statistics_update_own ON public.user_statistics
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'achievements' AND policyname = 'achievements_select_own'
  ) THEN
    CREATE POLICY achievements_select_own ON public.achievements
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'achievements' AND policyname = 'achievements_insert_own'
  ) THEN
    CREATE POLICY achievements_insert_own ON public.achievements
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
