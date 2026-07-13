
-- =========================================================
-- FASE 1 — Guia de Ruas e Avenidas de Alphaville
-- =========================================================

CREATE EXTENSION IF NOT EXISTS unaccent;

-- ---------- Colunas novas em properties / condominiums ----------
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS street_id uuid,
  ADD COLUMN IF NOT EXISTS street_match_type text,
  ADD COLUMN IF NOT EXISTS street_match_confidence integer;

ALTER TABLE public.condominiums
  ADD COLUMN IF NOT EXISTS street_id uuid,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text;

CREATE INDEX IF NOT EXISTS idx_properties_street_id ON public.properties(street_id);
CREATE INDEX IF NOT EXISTS idx_properties_postal_code ON public.properties(postal_code);
CREATE INDEX IF NOT EXISTS idx_condominiums_street_id ON public.condominiums(street_id);

-- ---------- Tabela streets ----------
CREATE TABLE IF NOT EXISTS public.streets (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                     text NOT NULL UNIQUE,
  name                     text NOT NULL,
  official_name            text,
  short_name               text,
  street_type              text,                -- alameda | avenida | rua | rodovia | estrada | praca | travessa | calcada
  neighborhood             text,
  city                     text,
  state                    text DEFAULT 'SP',
  postal_code_start        text,
  postal_code_end          text,
  latitude                 numeric,
  longitude                numeric,
  short_description        text,
  description              text,
  history                  text,
  real_estate_profile      text,
  commercial_profile       text,
  residential_profile      text,
  access_information       text,
  traffic_information      text,
  public_transport_information text,
  parking_information      text,
  nearby_services          jsonb NOT NULL DEFAULT '[]'::jsonb,
  nearby_landmarks         jsonb NOT NULL DEFAULT '[]'::jsonb,
  nearby_schools           jsonb NOT NULL DEFAULT '[]'::jsonb,
  nearby_supermarkets      jsonb NOT NULL DEFAULT '[]'::jsonb,
  nearby_restaurants       jsonb NOT NULL DEFAULT '[]'::jsonb,
  nearby_hospitals         jsonb NOT NULL DEFAULT '[]'::jsonb,
  nearby_shopping_centers  jsonb NOT NULL DEFAULT '[]'::jsonb,
  nearby_business_centers  jsonb NOT NULL DEFAULT '[]'::jsonb,
  nearby_condominium_ids   uuid[] NOT NULL DEFAULT '{}',
  nearby_neighborhoods     text[] NOT NULL DEFAULT '{}',
  nearby_street_ids        uuid[] NOT NULL DEFAULT '{}',
  hero_image               text,
  gallery_images           jsonb NOT NULL DEFAULT '[]'::jsonb,
  map_embed                text,
  faq                      jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title                text,
  seo_description          text,
  seo_keywords             text,
  canonical_url            text,
  h1                       text,
  featured                 boolean NOT NULL DEFAULT false,
  active                   boolean NOT NULL DEFAULT true,
  manually_reviewed        boolean NOT NULL DEFAULT false,
  status                   text NOT NULL DEFAULT 'draft', -- draft | review | published | archived
  published_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  created_by               uuid
);

CREATE INDEX IF NOT EXISTS idx_streets_slug ON public.streets(slug);
CREATE INDEX IF NOT EXISTS idx_streets_city ON public.streets(city);
CREATE INDEX IF NOT EXISTS idx_streets_neighborhood ON public.streets(neighborhood);
CREATE INDEX IF NOT EXISTS idx_streets_status ON public.streets(status);
CREATE INDEX IF NOT EXISTS idx_streets_featured ON public.streets(featured) WHERE featured = true;

-- FK opcional em condominiums.street_id -> streets.id
ALTER TABLE public.condominiums
  DROP CONSTRAINT IF EXISTS condominiums_street_id_fkey;
ALTER TABLE public.condominiums
  ADD CONSTRAINT condominiums_street_id_fkey
  FOREIGN KEY (street_id) REFERENCES public.streets(id) ON DELETE SET NULL;

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_street_id_fkey;
ALTER TABLE public.properties
  ADD CONSTRAINT properties_street_id_fkey
  FOREIGN KEY (street_id) REFERENCES public.streets(id) ON DELETE SET NULL;

GRANT SELECT ON public.streets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streets TO authenticated;
GRANT ALL ON public.streets TO service_role;

ALTER TABLE public.streets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published streets public"
  ON public.streets FOR SELECT TO anon
  USING (status = 'published' AND active = true);

CREATE POLICY "Auth read streets"
  ON public.streets FOR SELECT TO authenticated
  USING ((status = 'published' AND active = true) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage streets"
  ON public.streets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- Tabela street_aliases ----------
CREATE TABLE IF NOT EXISTS public.street_aliases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  street_id        uuid NOT NULL REFERENCES public.streets(id) ON DELETE CASCADE,
  alias            text NOT NULL,
  normalized_alias text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (street_id, normalized_alias)
);

CREATE INDEX IF NOT EXISTS idx_street_aliases_normalized ON public.street_aliases(normalized_alias);
CREATE INDEX IF NOT EXISTS idx_street_aliases_street_id ON public.street_aliases(street_id);

GRANT SELECT ON public.street_aliases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.street_aliases TO authenticated;
GRANT ALL ON public.street_aliases TO service_role;

ALTER TABLE public.street_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aliases of published streets public"
  ON public.street_aliases FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.streets s WHERE s.id = street_id AND s.status = 'published' AND s.active = true));

CREATE POLICY "Auth read aliases"
  ON public.street_aliases FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.streets s WHERE s.id = street_id AND s.status = 'published' AND s.active = true)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins manage aliases"
  ON public.street_aliases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- Tabela property_streets ----------
CREATE TABLE IF NOT EXISTS public.property_streets (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id          uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  street_id            uuid NOT NULL REFERENCES public.streets(id) ON DELETE CASCADE,
  match_type           text NOT NULL,     -- exact_name | normalized | alias | postal_code | neighborhood | condominium | manual
  match_confidence     integer NOT NULL DEFAULT 0,  -- 0..100
  manually_confirmed   boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, street_id)
);

CREATE INDEX IF NOT EXISTS idx_property_streets_property ON public.property_streets(property_id);
CREATE INDEX IF NOT EXISTS idx_property_streets_street ON public.property_streets(street_id);
CREATE INDEX IF NOT EXISTS idx_property_streets_confidence ON public.property_streets(match_confidence);

GRANT SELECT ON public.property_streets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_streets TO authenticated;
GRANT ALL ON public.property_streets TO service_role;

ALTER TABLE public.property_streets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public street-property links visible"
  ON public.property_streets FOR SELECT TO anon
  USING (
    EXISTS (SELECT 1 FROM public.streets s WHERE s.id = street_id AND s.status = 'published' AND s.active = true)
    AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'active')
  );

CREATE POLICY "Auth read street-property links"
  ON public.property_streets FOR SELECT TO authenticated
  USING (
    (
      EXISTS (SELECT 1 FROM public.streets s WHERE s.id = street_id AND s.status = 'published' AND s.active = true)
      AND EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.status = 'active')
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins manage street-property links"
  ON public.property_streets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ---------- Tabela seo_redirects ----------
CREATE TABLE IF NOT EXISTS public.seo_redirects (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_url        text NOT NULL UNIQUE,
  new_url        text NOT NULL,
  redirect_type  integer NOT NULL DEFAULT 301,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_redirects_old_url ON public.seo_redirects(old_url) WHERE active = true;

GRANT SELECT ON public.seo_redirects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_redirects TO authenticated;
GRANT ALL ON public.seo_redirects TO service_role;

ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active redirects public"
  ON public.seo_redirects FOR SELECT TO anon
  USING (active = true);

CREATE POLICY "Auth read redirects"
  ON public.seo_redirects FOR SELECT TO authenticated
  USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage redirects"
  ON public.seo_redirects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- Normalização de texto de rua
-- =========================================================
CREATE OR REPLACE FUNCTION public.normalize_street_text(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT NULLIF(
    trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        lower(public.unaccent(coalesce(txt, ''))),
                        '[.,;:()"''`]', ' ', 'g'
                      ),
                      '\balameda\b|\bal\b',    'alameda',  'g'
                    ),
                    '\bavenida\b|\bav\b',      'avenida',  'g'
                  ),
                  '\brua\b|\br\b',             'rua',      'g'
                ),
                '\brodovia\b|\brod\b',         'rodovia',  'g'
              ),
              '\bestrada\b|\bestr\b',          'estrada',  'g'
            ),
            '\bpraca\b|\bpca\b',               'praca',    'g'
          ),
          '\btravessa\b|\btrav\b',             'travessa', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ),
    ''
  );
$$;

-- Índices funcionais para busca por nome normalizado
CREATE INDEX IF NOT EXISTS idx_streets_normalized_name
  ON public.streets ((public.normalize_street_text(name)));
CREATE INDEX IF NOT EXISTS idx_streets_normalized_official
  ON public.streets ((public.normalize_street_text(official_name)));
CREATE INDEX IF NOT EXISTS idx_properties_normalized_address
  ON public.properties ((public.normalize_street_text(address)));

-- =========================================================
-- Matching automático de imóvel -> rua
-- =========================================================
CREATE OR REPLACE FUNCTION public.match_property_streets(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prop         public.properties%ROWTYPE;
  v_condo_street uuid;
  v_norm_address text;
  v_street_id    uuid;
  v_match_type   text;
  v_confidence   integer;
BEGIN
  SELECT * INTO v_prop FROM public.properties WHERE id = p_property_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Remove vínculos anteriores não-confirmados manualmente
  DELETE FROM public.property_streets
    WHERE property_id = p_property_id AND manually_confirmed = false;

  v_street_id := NULL;
  v_match_type := NULL;
  v_confidence := 0;

  -- 1. Via condomínio (mais confiável, 100)
  IF v_prop.condominium_id IS NOT NULL THEN
    SELECT street_id INTO v_condo_street
      FROM public.condominiums WHERE id = v_prop.condominium_id;
    IF v_condo_street IS NOT NULL THEN
      v_street_id := v_condo_street;
      v_match_type := 'condominium';
      v_confidence := 100;
    END IF;
  END IF;

  -- 2. Nome oficial / normalizado (95)
  IF v_street_id IS NULL AND v_prop.address IS NOT NULL THEN
    v_norm_address := public.normalize_street_text(v_prop.address);
    IF v_norm_address IS NOT NULL THEN
      SELECT id INTO v_street_id
        FROM public.streets
        WHERE active = true
          AND (
            public.normalize_street_text(official_name) = v_norm_address
            OR public.normalize_street_text(name) = v_norm_address
          )
        LIMIT 1;
      IF v_street_id IS NOT NULL THEN
        v_match_type := 'normalized';
        v_confidence := 95;
      END IF;
    END IF;

    -- 3. Match parcial (nome da rua contém o endereço ou vice-versa) — 85
    IF v_street_id IS NULL THEN
      SELECT id INTO v_street_id
        FROM public.streets
        WHERE active = true
          AND (
            v_norm_address LIKE '%' || public.normalize_street_text(name) || '%'
            OR public.normalize_street_text(name) LIKE '%' || v_norm_address || '%'
          )
        LIMIT 1;
      IF v_street_id IS NOT NULL THEN
        v_match_type := 'exact_name';
        v_confidence := 85;
      END IF;
    END IF;

    -- 4. Apelido (85)
    IF v_street_id IS NULL THEN
      SELECT street_id INTO v_street_id
        FROM public.street_aliases
        WHERE normalized_alias = v_norm_address
           OR v_norm_address LIKE '%' || normalized_alias || '%'
        LIMIT 1;
      IF v_street_id IS NOT NULL THEN
        v_match_type := 'alias';
        v_confidence := 85;
      END IF;
    END IF;
  END IF;

  -- 5. CEP (75) — só se estiver na faixa
  IF v_street_id IS NULL AND v_prop.postal_code IS NOT NULL THEN
    SELECT id INTO v_street_id
      FROM public.streets
      WHERE active = true
        AND postal_code_start IS NOT NULL
        AND postal_code_end IS NOT NULL
        AND regexp_replace(v_prop.postal_code, '\D', '', 'g')
            BETWEEN regexp_replace(postal_code_start, '\D', '', 'g')
                AND regexp_replace(postal_code_end,   '\D', '', 'g')
      LIMIT 1;
    IF v_street_id IS NOT NULL THEN
      v_match_type := 'postal_code';
      v_confidence := 75;
    END IF;
  END IF;

  -- Grava vínculo e denormaliza no properties (se houver match confiante)
  IF v_street_id IS NOT NULL THEN
    INSERT INTO public.property_streets
      (property_id, street_id, match_type, match_confidence, manually_confirmed)
    VALUES
      (p_property_id, v_street_id, v_match_type, v_confidence, false)
    ON CONFLICT (property_id, street_id) DO NOTHING;

    UPDATE public.properties
      SET street_id = v_street_id,
          street_match_type = v_match_type,
          street_match_confidence = v_confidence
      WHERE id = p_property_id;
  ELSE
    UPDATE public.properties
      SET street_id = NULL,
          street_match_type = NULL,
          street_match_confidence = NULL
      WHERE id = p_property_id;
  END IF;
END;
$$;

-- =========================================================
-- Triggers
-- =========================================================

-- streets: updated_at + validação de publicação
CREATE OR REPLACE FUNCTION public.street_is_publishable(g public.streets)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(length(trim(g.name)), 0) > 0
    AND COALESCE(length(trim(g.slug)), 0) > 0
    AND COALESCE(length(trim(coalesce(g.city, g.neighborhood, ''))), 0) > 0
    AND COALESCE(length(trim(coalesce(g.short_description, g.description, ''))), 0) > 0
    AND COALESCE(length(trim(coalesce(g.seo_title, g.name))), 0) > 0
    AND COALESCE(length(trim(coalesce(g.seo_description, g.short_description, ''))), 0) > 0
$$;

CREATE OR REPLACE FUNCTION public.streets_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'published' AND NOT public.street_is_publishable(NEW) THEN
    RAISE EXCEPTION 'street_not_publishable: preencha nome, slug, cidade/bairro, descrição, título e meta description antes de publicar.';
  END IF;
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_streets_before_write ON public.streets;
CREATE TRIGGER trg_streets_before_write
  BEFORE INSERT OR UPDATE ON public.streets
  FOR EACH ROW EXECUTE FUNCTION public.streets_before_write();

-- properties: rematch quando endereço/condomínio muda
CREATE OR REPLACE FUNCTION public.properties_rematch_street()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.address IS DISTINCT FROM OLD.address
     OR NEW.postal_code IS DISTINCT FROM OLD.postal_code
     OR NEW.condominium_id IS DISTINCT FROM OLD.condominium_id
     OR NEW.neighborhood IS DISTINCT FROM OLD.neighborhood
     OR NEW.city IS DISTINCT FROM OLD.city
  THEN
    PERFORM public.match_property_streets(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_properties_rematch_street ON public.properties;
CREATE TRIGGER trg_properties_rematch_street
  AFTER INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.properties_rematch_street();

-- condominiums: rematch de todos os imóveis do condo quando street_id muda
CREATE OR REPLACE FUNCTION public.condominiums_rematch_properties()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.street_id IS NOT DISTINCT FROM OLD.street_id THEN
    RETURN NEW;
  END IF;
  FOR r IN SELECT id FROM public.properties WHERE condominium_id = NEW.id LOOP
    PERFORM public.match_property_streets(r.id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_condominiums_rematch ON public.condominiums;
CREATE TRIGGER trg_condominiums_rematch
  AFTER UPDATE OF street_id ON public.condominiums
  FOR EACH ROW EXECUTE FUNCTION public.condominiums_rematch_properties();
