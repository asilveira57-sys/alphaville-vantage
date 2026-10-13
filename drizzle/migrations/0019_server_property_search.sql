ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS card_image_url text,
  ADD COLUMN IF NOT EXISTS large_image_url text,
  ADD COLUMN IF NOT EXISTS thumb_source text;

CREATE OR REPLACE FUNCTION public.search_norm(t text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public, pg_catalog AS $$
  SELECT btrim(regexp_replace(regexp_replace(lower(public.unaccent(coalesce(t,''))), '[^a-z0-9\s]', ' ', 'g'), '\s+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.fuzzy_norm(t text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public, pg_catalog AS $$
  SELECT btrim(lower(public.unaccent(coalesce(t,''))))
$$;

CREATE OR REPLACE FUNCTION public.fuzzy_eq(a text, b text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public, pg_catalog AS $$
  SELECT CASE
    WHEN public.fuzzy_norm(b) = '' THEN true
    WHEN public.fuzzy_norm(a) = '' THEN false
    ELSE public.fuzzy_norm(a) = public.fuzzy_norm(b)
      OR position(public.fuzzy_norm(b) in public.fuzzy_norm(a)) > 0
      OR position(public.fuzzy_norm(a) in public.fuzzy_norm(b)) > 0
  END
$$;

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
  SELECT p.*, c.name AS condo_official,
    COALESCE(NULLIF(COALESCE(p.parking_covered,0) + COALESCE(p.parking_uncovered,0), 0), p.parking, 0) AS ptot,
    GREATEST(COALESCE(p.area_useful,0), COALESCE(p.area_built,0), COALESCE(p.area_total,0)) AS amax,
    (SELECT min(v) FROM unnest(CASE
        WHEN p_purpose = 'sale' THEN ARRAY[NULLIF(p.price_sale,0)]
        WHEN p_purpose = 'rent' THEN ARRAY[NULLIF(p.price_rent,0)]
        ELSE ARRAY[NULLIF(p.price_sale,0), NULLIF(p.price_rent,0)] END) v) AS pval
  FROM public.properties p
  LEFT JOIN public.condominiums c ON c.id = p.condominium_id
  WHERE p.status = 'active'
), base AS (
  SELECT b0.*,
    public.search_norm(concat_ws(' ', NULLIF(condo_official,''), NULLIF(condominium_name,''))) AS condo_txt,
    public.search_norm(concat_ws(' ', NULLIF(title,''), NULLIF(condominium_name,''), NULLIF(condo_official,''), NULLIF(neighborhood,''),
      NULLIF(seo_title,''), NULLIF(city,''), NULLIF(region,''), NULLIF(description,''), NULLIF(descricao_seo,''))) AS full_txt
  FROM b0
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
    (p_phrase IS NOT NULL AND condo_txt ~ p_phrase) AS condo_m,
    (p_phrase IS NOT NULL AND full_txt ~ p_phrase) AS full_m,
    (NOT EXISTS (
      SELECT 1 FROM unnest(p_tokens) qt
      WHERE regexp_replace(' ' || full_txt || ' ', ' (r|rua|av|avenida|ave|al|alameda|tv|travessa|pc|pca|praca|rod|rodovia|estr|estrada|lgo|largo|via|de|da|do|das|dos|e)(?= )', ' ', 'g')
        !~ CASE WHEN qt ~ '^\d+$' OR length(qt) < 3 THEN ' ' || qt || ' ' ELSE ' ' || qt END
    )) AS tok_m
  FROM base
), f AS (
  SELECT COALESCE(bool_or(condo_m), false) AS c, COALESCE(bool_or(full_m), false) AS fm FROM m
), sel AS (
  SELECT m.* FROM m, f
  WHERE COALESCE(array_length(p_tokens,1),0) = 0
     OR (f.c AND m.condo_m) OR (NOT f.c AND f.fm AND m.full_m) OR (NOT f.c AND NOT f.fm AND m.tok_m)
)
SELECT s.id, s.slug, s.title, s.internal_code, s.purpose, s.property_type, s.city, s.neighborhood, s.region,
  COALESCE(s.condo_official, s.condominium_name), s.bedrooms, s.suites, NULLIF(s.ptot,0)::int,
  COALESCE(s.area_useful, s.area_built, s.area_total), s.area_useful, s.area_built, s.area_total,
  s.price_sale, s.price_rent,
  (SELECT u FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(s.images)='array' THEN s.images ELSE '[]'::jsonb END) WITH ORDINALITY x(u, o)
    WHERE u ~ '^https?://' AND u !~* '(logo|favicon|whats|placeholder|topo_contato)' ORDER BY o LIMIT 1),
  s.card_image_url,
  count(*) OVER ()
FROM sel s
ORDER BY
  CASE WHEN p_sort = 'price_asc' THEN COALESCE(s.price_sale, s.price_rent) END ASC NULLS LAST,
  CASE WHEN p_sort = 'price_desc' THEN COALESCE(s.price_sale, s.price_rent, 0) END DESC,
  CASE WHEN p_sort = 'area_desc' THEN s.amax END DESC,
  s.last_seen_at DESC NULLS LAST, s.id
LIMIT p_limit OFFSET p_offset
$$;

CREATE OR REPLACE FUNCTION public.property_search_facets() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH a AS (
  SELECT p.*, c.name AS condo_official FROM public.properties p
  LEFT JOIN public.condominiums c ON c.id = p.condominium_id WHERE p.status = 'active'
)
SELECT jsonb_build_object(
  'types', (SELECT COALESCE(jsonb_agg(t ORDER BY t), '[]') FROM (SELECT DISTINCT property_type t FROM a WHERE btrim(coalesce(property_type,'')) <> '') x),
  'cityCounts', (SELECT COALESCE(jsonb_object_agg(city, n), '{}') FROM (SELECT a.city, count(*) n FROM a JOIN public.cities ci ON ci.name = a.city GROUP BY a.city) x),
  'neighborhoodCounts', (SELECT COALESCE(jsonb_object_agg(neighborhood, n), '{}') FROM (SELECT neighborhood, count(*) n FROM a WHERE btrim(coalesce(neighborhood,'')) <> '' GROUP BY 1) x),
  'condoCounts', (SELECT COALESCE(jsonb_object_agg(condo_official, n), '{}') FROM (SELECT condo_official, count(*) n FROM a WHERE btrim(coalesce(condo_official,'')) <> '' GROUP BY 1) x),
  'total', (SELECT count(*) FROM a),
  'priceMax', (SELECT COALESCE(max(GREATEST(COALESCE(price_sale,0), COALESCE(price_rent,0))), 0) FROM a),
  'isRent', (SELECT bool_or(purpose='rent') AND NOT COALESCE(bool_or(purpose='sale'), false) FROM a)
)
$$;

REVOKE ALL ON FUNCTION public.search_properties(text,text,text,text,text,int,int,numeric,numeric,numeric,text,text,text[],int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_properties(text,text,text,text,text,int,int,numeric,numeric,numeric,text,text,text[],int,int) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.property_search_facets() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.property_search_facets() TO anon, authenticated, service_role;