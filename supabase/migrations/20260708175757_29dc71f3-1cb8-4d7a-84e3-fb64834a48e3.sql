
-- Enum for street guide status
DO $$ BEGIN
  CREATE TYPE public.street_guide_status AS ENUM ('draft', 'published', 'hidden');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.street_via_type AS ENUM ('alameda', 'avenida', 'rua', 'regiao', 'calcada', 'centro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.street_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  via_type public.street_via_type NOT NULL DEFAULT 'rua',
  city TEXT,
  region TEXT,
  neighborhood TEXT,

  short_description TEXT,
  long_description TEXT,
  intro_text TEXT,
  profile_tags TEXT[] NOT NULL DEFAULT '{}',
  nearby_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  faq JSONB NOT NULL DEFAULT '[]'::jsonb,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,

  seo_title TEXT,
  meta_description TEXT,
  h1 TEXT,
  og_image TEXT,
  canonical_override TEXT,
  seo_priority INTEGER NOT NULL DEFAULT 50,
  display_order INTEGER NOT NULL DEFAULT 100,

  related_condo_ids UUID[] NOT NULL DEFAULT '{}',
  related_property_ids UUID[] NOT NULL DEFAULT '{}',
  related_street_ids UUID[] NOT NULL DEFAULT '{}',
  related_regions TEXT[] NOT NULL DEFAULT '{}',
  hub_section TEXT,

  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  search_radius_km NUMERIC,

  status public.street_guide_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX street_guides_status_idx ON public.street_guides (status);
CREATE INDEX street_guides_hub_section_idx ON public.street_guides (hub_section);
CREATE INDEX street_guides_city_idx ON public.street_guides (city);

GRANT SELECT ON public.street_guides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.street_guides TO authenticated;
GRANT ALL ON public.street_guides TO service_role;

ALTER TABLE public.street_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published street guides"
  ON public.street_guides FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can read all street guides"
  ON public.street_guides FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert street guides"
  ON public.street_guides FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update street guides"
  ON public.street_guides FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete street guides"
  ON public.street_guides FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Quality gate: publishable check
CREATE OR REPLACE FUNCTION public.street_guide_is_publishable(g public.street_guides)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(length(trim(g.name)), 0) > 0
    AND COALESCE(length(trim(coalesce(g.city, g.region, ''))), 0) > 0
    AND COALESCE(length(trim(g.short_description)), 0) > 0
    AND COALESCE(length(trim(g.long_description)), 0) > 0
    AND COALESCE(length(trim(g.h1)), 0) > 0
    AND COALESCE(length(trim(g.seo_title)), 0) > 0
    AND COALESCE(length(trim(g.meta_description)), 0) > 0
    AND (
      array_length(g.related_condo_ids, 1) > 0
      OR array_length(g.related_property_ids, 1) > 0
      OR array_length(g.related_street_ids, 1) > 0
      OR array_length(g.related_regions, 1) > 0
      OR COALESCE(length(trim(g.neighborhood)), 0) > 0
    )
$$;

-- Trigger: block publish if not publishable; stamp published_at
CREATE OR REPLACE FUNCTION public.street_guides_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'published' AND NOT public.street_guide_is_publishable(NEW) THEN
    RAISE EXCEPTION 'street_guide_not_publishable: preencha nome, cidade/região, descrições, H1, SEO title, meta description e ao menos um relacionamento (bairro, condomínio, imóvel, rua ou região).';
  END IF;
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER street_guides_before_write
  BEFORE INSERT OR UPDATE ON public.street_guides
  FOR EACH ROW EXECUTE FUNCTION public.street_guides_before_write();
