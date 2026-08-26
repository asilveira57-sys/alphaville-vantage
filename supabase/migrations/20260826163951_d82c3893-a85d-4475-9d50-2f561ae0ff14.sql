-- Vitrine de Oportunidades — Fase 1
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS opportunity_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS opportunity_rank integer,
  ADD COLUMN IF NOT EXISTS opportunity_headline text,
  ADD COLUMN IF NOT EXISTS opportunity_reason text,
  ADD COLUMN IF NOT EXISTS opportunity_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS opportunity_expires_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_opportunity_status_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_opportunity_status_check
      CHECK (opportunity_status IN ('none', 'draft', 'published', 'paused', 'closed'));
  END IF;
END $$;

COMMENT ON COLUMN public.properties.opportunity_headline IS
  'Leitura da equipe. Nunca contem alegacao de preco — o selo e gerado por dado do sistema.';
COMMENT ON COLUMN public.properties.opportunity_expires_at IS
  'Validade da curadoria. Material vencido circulando e publicidade enganosa (CDC art. 37).';

CREATE INDEX IF NOT EXISTS idx_properties_opportunity
  ON public.properties (opportunity_rank NULLS LAST, opportunity_published_at DESC)
  WHERE opportunity_status = 'published';

CREATE TABLE IF NOT EXISTS public.property_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  price_sale numeric,
  price_rent numeric,
  observed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'scraper'
);

CREATE INDEX IF NOT EXISTS idx_price_history_property
  ON public.property_price_history (property_id, observed_at DESC);

GRANT SELECT ON public.property_price_history TO anon;
GRANT SELECT ON public.property_price_history TO authenticated;
GRANT ALL ON public.property_price_history TO service_role;

ALTER TABLE public.property_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Price history public read" ON public.property_price_history;
CREATE POLICY "Price history public read"
  ON public.property_price_history FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage price history" ON public.property_price_history;
CREATE POLICY "Admins manage price history"
  ON public.property_price_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.record_property_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.property_price_history (property_id, price_sale, price_rent, source)
    VALUES (NEW.id, NEW.price_sale, NEW.price_rent, 'initial');
  ELSIF (NEW.price_sale IS DISTINCT FROM OLD.price_sale)
     OR (NEW.price_rent IS DISTINCT FROM OLD.price_rent) THEN
    INSERT INTO public.property_price_history (property_id, price_sale, price_rent, source)
    VALUES (NEW.id, NEW.price_sale, NEW.price_rent, 'change');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_property_price_history ON public.properties;
CREATE TRIGGER trg_property_price_history
  AFTER INSERT OR UPDATE OF price_sale, price_rent ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.record_property_price_change();

INSERT INTO public.property_price_history (property_id, price_sale, price_rent, observed_at, source)
SELECT p.id, p.price_sale, p.price_rent, COALESCE(p.last_seen_at, p.created_at, now()), 'baseline'
FROM public.properties p
WHERE NOT EXISTS (
  SELECT 1 FROM public.property_price_history h WHERE h.property_id = p.id
);