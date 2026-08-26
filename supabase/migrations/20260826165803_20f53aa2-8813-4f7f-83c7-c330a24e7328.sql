CREATE TABLE IF NOT EXISTS public.opportunity_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('condo_median', 'neighborhood_median')),
  property_sqm_price numeric NOT NULL,
  reference_sqm_price numeric NOT NULL,
  delta_pct numeric GENERATED ALWAYS AS (
    round(((property_sqm_price - reference_sqm_price) / NULLIF(reference_sqm_price, 0)) * 100, 1)
  ) STORED,
  sample_size integer NOT NULL,
  window_months integer NOT NULL DEFAULT 12,
  comparables jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_label text NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  computed_by uuid REFERENCES auth.users(id)
);

COMMENT ON TABLE public.opportunity_valuations IS
  'Uma linha por apuracao, nunca sobrescrita. Arquivo de defesa: quem alega precisa comprovar.';

CREATE INDEX IF NOT EXISTS idx_opportunity_valuations_property
  ON public.opportunity_valuations (property_id, computed_at DESC);

GRANT SELECT ON public.opportunity_valuations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_valuations TO authenticated;
GRANT ALL ON public.opportunity_valuations TO service_role;

ALTER TABLE public.opportunity_valuations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Valuations public read" ON public.opportunity_valuations;
CREATE POLICY "Valuations public read"
  ON public.opportunity_valuations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage valuations" ON public.opportunity_valuations;
CREATE POLICY "Admins manage valuations"
  ON public.opportunity_valuations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS proposal_status text,
  ADD COLUMN IF NOT EXISTS proposal_status_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_proposal_status_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_proposal_status_check
      CHECK (proposal_status IS NULL OR proposal_status IN ('none', 'under_review'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.property_view_daily (
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT CURRENT_DATE,
  views integer NOT NULL DEFAULT 0,
  PRIMARY KEY (property_id, day)
);

GRANT SELECT ON public.property_view_daily TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_view_daily TO authenticated;
GRANT ALL ON public.property_view_daily TO service_role;

ALTER TABLE public.property_view_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Views public read" ON public.property_view_daily;
CREATE POLICY "Views public read"
  ON public.property_view_daily FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage views" ON public.property_view_daily;
CREATE POLICY "Admins manage views"
  ON public.property_view_daily FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.increment_property_view(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.property_view_daily (property_id, day, views)
  VALUES (p_property_id, CURRENT_DATE, 1)
  ON CONFLICT (property_id, day)
  DO UPDATE SET views = public.property_view_daily.views + 1;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_property_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_property_view(uuid) TO service_role;