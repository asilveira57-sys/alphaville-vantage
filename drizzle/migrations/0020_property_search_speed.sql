CREATE OR REPLACE FUNCTION public.search_norm(t text) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT btrim(regexp_replace(regexp_replace(lower(public.unaccent('public.unaccent'::regdictionary, coalesce(t,''))), '[^a-z0-9\s]', ' ', 'g'), '\s+', ' ', 'g'))
$$;
CREATE OR REPLACE FUNCTION public.fuzzy_norm(t text) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT btrim(lower(public.unaccent('public.unaccent'::regdictionary, coalesce(t,''))))
$$;
CREATE OR REPLACE FUNCTION public.fuzzy_eq(a text, b text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN public.fuzzy_norm(b) = '' THEN true
    WHEN public.fuzzy_norm(a) = '' THEN false
    ELSE position(public.fuzzy_norm(b) in public.fuzzy_norm(a)) > 0
      OR position(public.fuzzy_norm(a) in public.fuzzy_norm(b)) > 0
  END
$$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS search_pre text,
  ADD COLUMN IF NOT EXISTS search_post text;

CREATE OR REPLACE FUNCTION public.properties_search_text() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_pre := public.search_norm(concat_ws(' ', NEW.title, NEW.condominium_name));
  NEW.search_post := public.search_norm(concat_ws(' ', NEW.neighborhood, NEW.seo_title, NEW.city, NEW.region, NEW.description, NEW.descricao_seo));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_properties_search_text ON public.properties;
CREATE TRIGGER trg_properties_search_text BEFORE INSERT OR UPDATE OF title, condominium_name, neighborhood, seo_title, city, region, description, descricao_seo
ON public.properties FOR EACH ROW EXECUTE FUNCTION public.properties_search_text();

UPDATE public.properties SET
  search_pre = public.search_norm(concat_ws(' ', title, condominium_name)),
  search_post = public.search_norm(concat_ws(' ', neighborhood, seo_title, city, region, description, descricao_seo));

CREATE OR REPLACE FUNCTION public.search_properties(
  p_purpose text DEFAULT '', p_type text DEFAULT '', p_city text DEFAULT '',
  p_neighborhood text DEFAULT '', p_condo text DEFAULT '',
  p_bedrooms int DEFAULT 0, p_parking int DEFAULT 0,
  p_price_min numeric DEFAULT 0, p_price_max numeric DEFAULT 0, p_area_min numeric DEFAULT 0,
  p_sort text DEFAULT 'recent', p_phrase text DEFAULT NULL, p_tokens text[] DEFAULT '{}',
  p_limit int DEFAULT 15, p_offset int DEFAULT 0
) RETURNS TABLE (
  id uuid, slug text, title text, internal_code text, purpose text, property_type text,
  city text, neighborhood text, region text, condo_name text, bedrooms int, suites int,
  parking_total int, area numeric, area_useful numeric, area_built numeric, area_total numeric,
  price_sale numeric, price_rent numeric, image text, card_image_url text, total bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH b0 AS (
  SELECT p.id, p.slug, p.title, p.internal_code, p.purpose, p.property_type, p.city, p.neighborhood, p.region,
    p.condominium_name, p.bedrooms, p.suites, p.area_useful, p.area_built, p.area_total, p.price_sale, p.price_rent,
    p.images, p.card_image_url, p.last_seen_at, p.search_pre, p.search_post,
    c.name AS condo_official,
    COALESCE(NULLIF(COALESCE(p.parking_covered,0) + COALESCE(p.parking_uncovered,0), 0), p.parking, 0) AS ptot,
    GREATEST(COALESCE(p.area_useful,0), COALESCE(p.area_built,0), COALESCE(p.area_total,0)) AS amax,
    CASE WHEN p_purpose = 'sale' THEN NULLIF(p.price_sale,0)
         WHEN p_purpose = 'rent' THEN NULLIF(p.price_rent,0)
         ELSE LEAST(NULLIF(p.price_sale,0), NULLIF(p.price_rent,0)) END AS pval
  FROM public.properties p
  LEFT JOIN public.condominiums c ON c.id = p.condominium_id
  WHERE p.status = 'active'
), base AS (
  SELECT b0.* FROM b0
  WHERE (p_purpose = '' OR b0.purpose = p_purpose OR b0.purpose = 'both' OR p_purpose = 'both')
    AND (p_type = '' OR public.fuzzy_eq(b0.property_type, p_type))
    AND (p_city = '' OR public.fuzzy_eq(b0.city, p_city))
    AND (p_neighborhood = '' OR public.fuzzy_eq(b0.neighborhood, p_neighborhood) OR public.fuzzy_eq(b0.region, p_neighborhood)
         OR public.fuzzy_eq(b0.condo_official, p_neighborhood) OR public.fuzzy_eq(b0.condominium_name, p_neighborhood))
    AND (p_condo = '' OR public.fuzzy_eq(COALESCE(b0.condo_official, b0.condominium_name), p_condo))
    AND (p_bedrooms = 0 OR COALESCE(b0.bedrooms,0) >= p_bedrooms)
    AND (p_parking = 0 OR b0.ptot >= p_parking)
    AND ((p_price_min = 0 AND p_price_max = 0) OR (b0.pval IS NOT NULL
         AND (p_price_min = 0 OR b0.pval >= p_price_min) AND (p_price_max = 0 OR b0.pval <= p_price_max)))
    AND (p_area_min = 0 OR b0.amax >= p_area_min)
), m AS (
  SELECT base.*,
    CASE WHEN p_phrase IS NULL THEN false ELSE
      public.search_norm(concat_ws(' ', base.condo_official, base.condominium_name)) ~ p_phrase END AS condo_m,
    CASE WHEN p_phrase IS NULL THEN false ELSE
      concat_ws(' ', NULLIF(base.search_pre,''), NULLIF(public.search_norm(base.condo_official),''), NULLIF(base.search_post,'')) ~ p_phrase END AS full_m,
    CASE WHEN p_phrase IS NULL THEN true ELSE NOT EXISTS (
      SELECT 1 FROM unnest(p_tokens) qt
      WHERE regexp_replace(' ' || concat_ws(' ', NULLIF(base.search_pre,''), NULLIF(public.search_norm(base.condo_official),''), NULLIF(base.search_post,'')) || ' ',
              ' (r|rua|av|avenida|ave|al|alameda|tv|travessa|pc|pca|praca|rod|rodovia|estr|estrada|lgo|largo|via|de|da|do|das|dos|e)(?= )', ' ', 'g')
        !~ CASE WHEN qt ~ '^\d+$' OR length(qt) < 3 THEN ' ' || qt || ' ' ELSE ' ' || qt END
    ) END AS tok_m
  FROM base
), f AS (
  SELECT COALESCE(bool_or(condo_m), false) AS c, COALESCE(bool_or(full_m), false) AS fm FROM m
), sel AS (
  SELECT m.* FROM m, f
  WHERE p_phrase IS NULL
     OR (f.c AND m.condo_m) OR (NOT f.c AND f.fm AND m.full_m) OR (NOT f.c AND NOT f.fm AND m.tok_m)
), ranked AS (
  SELECT s.*, count(*) OVER () AS total FROM sel s
  ORDER BY
    CASE WHEN p_sort = 'price_asc' THEN COALESCE(s.price_sale, s.price_rent) END ASC NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN COALESCE(s.price_sale, s.price_rent, 0) END DESC,
    CASE WHEN p_sort = 'area_desc' THEN s.amax END DESC,
    s.last_seen_at DESC NULLS LAST, s.id
  LIMIT p_limit OFFSET p_offset
)
SELECT r.id, r.slug, r.title, r.internal_code, r.purpose, r.property_type, r.city, r.neighborhood, r.region,
  COALESCE(r.condo_official, r.condominium_name), r.bedrooms, r.suites, NULLIF(r.ptot,0)::int,
  COALESCE(r.area_useful, r.area_built, r.area_total), r.area_useful, r.area_built, r.area_total,
  r.price_sale, r.price_rent,
  (SELECT u FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(r.images)='array' THEN r.images ELSE '[]'::jsonb END) WITH ORDINALITY x(u, o)
    WHERE u ~ '^https?://' AND u !~* '(logo|favicon|whats|placeholder|topo_contato)' ORDER BY o LIMIT 1),
  r.card_image_url, r.total
FROM ranked r
$$;