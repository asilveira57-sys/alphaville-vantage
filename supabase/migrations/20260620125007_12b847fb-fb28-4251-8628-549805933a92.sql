
-- Fase 1: campos estruturados para filtros
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS condominium_name text,
  ADD COLUMN IF NOT EXISTS condo_fee numeric,
  ADD COLUMN IF NOT EXISTS iptu numeric,
  ADD COLUMN IF NOT EXISTS bathrooms integer,
  ADD COLUMN IF NOT EXISTS area_built numeric,
  ADD COLUMN IF NOT EXISTS furnished boolean,
  ADD COLUMN IF NOT EXISTS is_launch boolean,
  ADD COLUMN IF NOT EXISTS accepts_exchange boolean,
  ADD COLUMN IF NOT EXISTS internal_code text,
  ADD COLUMN IF NOT EXISTS extracted_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS manual_overrides jsonb DEFAULT '{}'::jsonb;

-- Índices para filtros
CREATE INDEX IF NOT EXISTS idx_properties_purpose ON public.properties(purpose);
CREATE INDEX IF NOT EXISTS idx_properties_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_neighborhood ON public.properties(neighborhood);
CREATE INDEX IF NOT EXISTS idx_properties_condominium_name ON public.properties(condominium_name);
CREATE INDEX IF NOT EXISTS idx_properties_price_sale ON public.properties(price_sale);
CREATE INDEX IF NOT EXISTS idx_properties_price_rent ON public.properties(price_rent);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON public.properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_suites ON public.properties(suites);
CREATE INDEX IF NOT EXISTS idx_properties_parking ON public.properties(parking);
CREATE INDEX IF NOT EXISTS idx_properties_area_useful ON public.properties(area_useful);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_slug ON public.properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_external_ref ON public.properties(external_ref);
CREATE INDEX IF NOT EXISTS idx_properties_accepts_exchange ON public.properties(accepts_exchange);
CREATE INDEX IF NOT EXISTS idx_properties_is_launch ON public.properties(is_launch);
