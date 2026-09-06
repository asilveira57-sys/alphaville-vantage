CREATE TABLE IF NOT EXISTS public.cron_hook_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hook text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cron_hook_runs TO authenticated;
GRANT ALL ON public.cron_hook_runs TO service_role;

ALTER TABLE public.cron_hook_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read cron_hook_runs" ON public.cron_hook_runs;
CREATE POLICY "Admins read cron_hook_runs" ON public.cron_hook_runs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS cron_hook_runs_hook_created_idx
  ON public.cron_hook_runs (hook, created_at DESC);