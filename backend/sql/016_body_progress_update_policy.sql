-- Missing RLS policy: body_progress_entries only had SELECT/INSERT policies,
-- so the reanalyze endpoint's UPDATE was silently blocked (0 rows affected).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'body_progress_entries'
      AND policyname = 'body_progress_entries_update_own'
  ) THEN
    CREATE POLICY body_progress_entries_update_own
      ON public.body_progress_entries
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
