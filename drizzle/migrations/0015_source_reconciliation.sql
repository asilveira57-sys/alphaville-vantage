CREATE TABLE public.source_reconciliation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  triggered_by text NOT NULL DEFAULT 'cron',
  origin_count integer,
  sitemap_count integer,
  portal_active integer,
  portal_paused integer,
  paused integer NOT NULL DEFAULT 0,
  reactivated integer NOT NULL DEFAULT 0,
  imported integer NOT NULL DEFAULT 0,
  merged integer NOT NULL DEFAULT 0,
  paths_updated integer NOT NULL DEFAULT 0,
  missing_in_portal integer,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);
GRANT SELECT ON public.source_reconciliation_runs TO authenticated;
GRANT ALL ON public.source_reconciliation_runs TO service_role;
ALTER TABLE public.source_reconciliation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read reconciliation runs" ON public.source_reconciliation_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE TABLE public.source_missing (
  source_id text PRIMARY KEY,
  misses integer NOT NULL DEFAULT 1,
  first_missed_at timestamptz NOT NULL DEFAULT now(),
  last_missed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.source_missing TO service_role;
ALTER TABLE public.source_missing ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS properties_source_id_idx ON public.properties (source_id);