
-- SEO state (single row)
CREATE TABLE public.seo_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  sitemap_purged_at timestamptz NOT NULL DEFAULT now(),
  indexnow_last_run_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_state TO authenticated;
GRANT ALL ON public.seo_state TO service_role;
ALTER TABLE public.seo_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read seo_state" ON public.seo_state FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.seo_state (id) VALUES (true) ON CONFLICT DO NOTHING;

-- SEO runs (history)
CREATE TABLE public.seo_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('indexnow','monthly','purge','audit')),
  urls_count integer NOT NULL DEFAULT 0,
  http_status integer,
  error text,
  triggered_by text NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual','cron','auto')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_runs TO authenticated;
GRANT ALL ON public.seo_runs TO service_role;
ALTER TABLE public.seo_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read seo_runs" ON public.seo_runs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX seo_runs_created_at_idx ON public.seo_runs (created_at DESC);
