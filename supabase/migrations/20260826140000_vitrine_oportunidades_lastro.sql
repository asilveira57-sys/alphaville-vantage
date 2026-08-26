-- Vitrine de Oportunidades — Fase 2
-- 1. Lastro da comparação de preço (arquivo imutável de apurações)
-- 2. Sinais de demanda e de proposta, ambos derivados de dado com data

-- ------------------------------------------------------------------ lastro

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
  'Uma linha por apuração, nunca sobrescrita. É o arquivo de defesa exigido pelo '
  'CDC art. 36 §único e art. 38, e pelo CONAR art. 27 §1º: quem alega precisa comprovar.';
COMMENT ON COLUMN public.opportunity_valuations.comparables IS
  'Os imóveis efetivamente usados no cálculo, com preço e área no momento da apuração.';
COMMENT ON COLUMN public.opportunity_valuations.source_label IS
  'Origem declarada ao público. Hoje: preços de anúncio do acervo — nunca "mercado".';

CREATE INDEX IF NOT EXISTS idx_opportunity_valuations_property
  ON public.opportunity_valuations (property_id, computed_at DESC);

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

-- --------------------------------------------------------- proposta em análise

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

COMMENT ON COLUMN public.properties.proposal_status IS
  'Marcado no admin quando existe proposta registrada. O sinal público expira '
  'sozinho após 7 dias — escassez sem lastro é publicidade enganosa.';

-- ------------------------------------------------------------- visualizações

CREATE TABLE IF NOT EXISTS public.property_view_daily (
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT CURRENT_DATE,
  views integer NOT NULL DEFAULT 0,
  PRIMARY KEY (property_id, day)
);

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

-- Incremento atômico. A escrita passa só por aqui, nunca por UPDATE direto.
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
