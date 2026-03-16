DO $$ BEGIN
  CREATE TYPE sex_enum AS ENUM ('male', 'female', 'other', 'prefer_not_say');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE experience_level_enum AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE goal_enum AS ENUM ('lose_fat', 'gain_muscle', 'strength', 'general_fitness', 'mobility');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE muscle_enum AS ENUM ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body', 'cardio', 'mobility', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE equipment_enum AS ENUM ('none', 'dumbbells', 'barbell', 'machine', 'cables', 'bands', 'kettlebell', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE difficulty_enum AS ENUM ('beginner', 'intermediate', 'advanced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE media_type_enum AS ENUM ('image', 'video', 'link');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE routine_status_enum AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE generation_reason_enum AS ENUM ('initial', 'regenerate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE routine_approval_status_enum AS ENUM ('proposed', 'approved', 'discarded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE perceived_effort_enum AS ENUM ('easy', 'moderate', 'hard');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  birth_date date,
  age smallint,
  sex sex_enum,
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  experience_level experience_level_enum,
  goal goal_enum,
  days_per_week smallint CHECK (days_per_week BETWEEN 1 AND 7),
  time_per_session smallint CHECK (time_per_session BETWEEN 15 AND 180),
  bmi numeric(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN height_cm IS NOT NULL AND weight_kg IS NOT NULL AND height_cm > 0
      THEN ROUND(weight_kg / ((height_cm / 100) * (height_cm / 100)), 2)
      ELSE NULL
    END
  ) STORED,
  bmi_category text GENERATED ALWAYS AS (
    CASE
      WHEN height_cm IS NOT NULL AND weight_kg IS NOT NULL AND height_cm > 0 THEN
        CASE
          WHEN (weight_kg / ((height_cm / 100) * (height_cm / 100))) < 18.5 THEN 'underweight'
          WHEN (weight_kg / ((height_cm / 100) * (height_cm / 100))) < 25 THEN 'normal'
          WHEN (weight_kg / ((height_cm / 100) * (height_cm / 100))) < 30 THEN 'overweight'
          ELSE 'obese'
        END
      ELSE NULL
    END
  ) STORED,
  completed boolean DEFAULT false,
  profile_confirmed boolean DEFAULT false,
  confirmed_at timestamptz,
  email text,
  avatar_url text,
  auth_provider text,
  auth_providers text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.health_history (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  injuries text[],
  joint_problems text[],
  conditions text[],
  limitations text[],
  notes text,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.body_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at timestamptz DEFAULT now(),
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  bmi numeric(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN height_cm IS NOT NULL AND weight_kg IS NOT NULL AND height_cm > 0
      THEN ROUND(weight_kg / ((height_cm / 100) * (height_cm / 100)), 2)
      ELSE NULL
    END
  ) STORED,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  primary_muscle muscle_enum NOT NULL,
  equipment equipment_enum NOT NULL,
  difficulty difficulty_enum NOT NULL,
  description text,
  safety_tips text,
  contraindications text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercise_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  media_type media_type_enum NOT NULL,
  url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  status routine_status_enum DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routine_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  generation_reason generation_reason_enum NOT NULL,
  model_provider text,
  model_name text,
  prompt_version text,
  temperature numeric(3,2),
  context_snapshot jsonb NOT NULL,
  llm_output jsonb NOT NULL,
  safety_warnings text,
  approval_status routine_approval_status_enum DEFAULT 'proposed',
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (routine_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.routine_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_version_id uuid NOT NULL REFERENCES public.routine_versions(id) ON DELETE CASCADE,
  day_index smallint NOT NULL CHECK (day_index BETWEEN 1 AND 7),
  day_label text NOT NULL,
  warmup_notes text,
  cooldown_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.routine_day_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_day_id uuid NOT NULL REFERENCES public.routine_days(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  exercise_order smallint NOT NULL,
  sets smallint NOT NULL,
  reps text NOT NULL,
  rest_seconds int,
  rpe numeric(3,1),
  tempo text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_version_id uuid REFERENCES public.routine_versions(id) ON DELETE SET NULL,
  routine_day_id uuid REFERENCES public.routine_days(id) ON DELETE SET NULL,
  session_date date NOT NULL,
  started_at timestamptz,
  ended_at timestamptz,
  perceived_effort perceived_effort_enum,
  difficulty_rating smallint CHECK (difficulty_rating BETWEEN 1 AND 10),
  pain_or_discomfort boolean,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workout_session_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  exercise_order smallint NOT NULL,
  planned_sets smallint,
  planned_reps text,
  performed_sets smallint,
  performed_reps text,
  weight_kg numeric(6,2),
  rest_seconds int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_health_history_user_id ON public.health_history(user_id);
CREATE INDEX IF NOT EXISTS idx_body_metrics_user_id ON public.body_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON public.exercises(name);
CREATE INDEX IF NOT EXISTS idx_routines_user_id ON public.routines(user_id);
CREATE INDEX IF NOT EXISTS idx_routine_versions_routine_id ON public.routine_versions(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_days_version_id ON public.routine_days(routine_version_id);
CREATE INDEX IF NOT EXISTS idx_routine_day_exercises_day_id ON public.routine_day_exercises(routine_day_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON public.workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_exercises_session_id ON public.workout_session_exercises(session_id);
