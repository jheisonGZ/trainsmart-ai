-- Repair historical inconsistencies in workout_sessions and enforce
-- one routine-day session per user going forward.

-- 1. If a routine day already has a completed session, close any stale open
-- sessions for that same user/day so they stop appearing as "in progress".
WITH stale_open_sessions AS (
  SELECT
    ws.id,
    COALESCE(ws.started_at, ws.created_at, now()) AS resolved_ended_at
  FROM public.workout_sessions ws
  WHERE ws.routine_day_id IS NOT NULL
    AND ws.ended_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.workout_sessions completed
      WHERE completed.user_id = ws.user_id
        AND completed.routine_day_id = ws.routine_day_id
        AND completed.id <> ws.id
        AND completed.ended_at IS NOT NULL
    )
)
UPDATE public.workout_sessions ws
SET ended_at = stale_open_sessions.resolved_ended_at
FROM stale_open_sessions
WHERE ws.id = stale_open_sessions.id;

-- 2. Keep only one canonical session per user and routine day.
-- Preference order:
--   a) the most recent completed session, if one exists
--   b) otherwise, the most recent open session
WITH ranked_sessions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, routine_day_id
      ORDER BY
        CASE WHEN ended_at IS NOT NULL THEN 0 ELSE 1 END,
        COALESCE(ended_at, started_at, created_at) DESC,
        created_at DESC,
        id DESC
    ) AS row_rank
  FROM public.workout_sessions
  WHERE routine_day_id IS NOT NULL
)
DELETE FROM public.workout_sessions ws
USING ranked_sessions rs
WHERE ws.id = rs.id
  AND rs.row_rank > 1;

-- 3. Prevent the same user from creating multiple sessions for the same
-- routine day in the future. This matches the product rule: one day, one
-- persisted session row, with internal block progress handled inside that row.
CREATE UNIQUE INDEX IF NOT EXISTS uq_workout_sessions_user_routine_day
  ON public.workout_sessions(user_id, routine_day_id)
  WHERE routine_day_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_day_created_at
  ON public.workout_sessions(user_id, routine_day_id, created_at DESC)
  WHERE routine_day_id IS NOT NULL;
