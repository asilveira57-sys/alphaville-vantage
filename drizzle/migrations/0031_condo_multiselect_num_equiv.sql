-- Canonicaliza números em nomes de condomínio: "Residencial I" = "Residencial 1" = "Residencial Um".
CREATE OR REPLACE FUNCTION public.condo_num_norm(t text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_catalog AS $$
DECLARE
  x text := ' ' || coalesce(t, '') || ' ';
  m text[][] := ARRAY[
    ['um|uma|primeiro|primeira','1'],['dois|duas|segundo|segunda','2'],['tres|terceiro|terceira','3'],
    ['quatro|quarta','4'],['cinco|quinta','5'],['seis|sexta','6'],
    ['sete|setima','7'],['oito|oitava','8'],['nove|nona','9'],
    ['dez|decima','10'],['onze','11'],['doze','12'],
    ['xii','12'],['xi','11'],['ix','9'],['viii','8'],['vii','7'],['vi','6'],['iv','4'],['iii','3'],['ii','2'],['i','1'],['v','5']
  ];
  pair text[];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY m LOOP
    x := regexp_replace(x, ' (' || pair[1] || ') ', ' ' || pair[2] || ' ', 'g');
  END LOOP;
  x := regexp_replace(x, ' 0+(\d) ', ' \1 ', 'g');
  RETURN btrim(regexp_replace(x, '\s+', ' ', 'g'));
END $$;

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS search_condo_num text;

CREATE OR REPLACE FUNCTION public.properties_search_hay_sync() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_condo text; v_aliases text;
BEGIN
  IF NEW.condominium_id IS NOT NULL THEN
    SELECT c.name INTO v_condo FROM public.condominiums c WHERE c.id = NEW.condominium_id;
    SELECT string_agg(ca.normalized_alias, ' ') INTO v_aliases FROM public.condominium_aliases ca WHERE ca.condominium_id = NEW.condominium_id;
  END IF;
  NEW.search_condo_norm := public.search_norm(concat_ws(' ', v_condo, NEW.condominium_name));
  NEW.search_condo_num := public.condo_num_norm(public.search_norm(concat_ws(' ', v_condo, NEW.condominium_name, v_aliases)));
  NEW.search_hay := public.search_norm(concat_ws(' ', NEW.title, NEW.condominium_name, v_condo, NEW.neighborhood, NEW.seo_title, NEW.city, NEW.region, NEW.description, NEW.descricao_seo));
  RETURN NEW;
END $$;

UPDATE public.properties p SET search_condo_num = public.condo_num_norm(public.search_norm(concat_ws(' ',
  (SELECT c.name FROM public.condominiums c WHERE c.id = p.condominium_id),
  p.condominium_name,
  (SELECT string_agg(ca.normalized_alias, ' ') FROM public.condominium_aliases ca WHERE ca.condominium_id = p.condominium_id)
)));

DROP FUNCTION public.search_properties(text,text,text,text,text,integer,integer,numeric,numeric,numeric,text,text,text[],integer,integer);

CREATE OR REPLACE FUNCTION public.search_properties(
  p_purpose text DEFAULT '', p_type text DEFAULT '', p_city text DEFAULT '',
  p_neighborhood text DEFAULT '', p_condo text DEFAULT '',
  p_bedrooms int DEFAULT 0, p_parking int DEFAULT 0,
  p_price_min numeric DEFAULT 0, p_price_max numeric DEFAULT 0, p_area_min numeric DEFAULT 0,
  p_sort text DEFAULT 'price_asc', p_phrase text DEFAULT NULL, p_tokens text[] DEFAULT '{}',
  p_limit int DEFAULT 15, p_offset int DEFAULT 0, p_condo_ids uuid[] DEFAULT NULL
) RETURNS TABLE (
  id uuid, slug text, title text, internal_code text, purpose text, property_type text,
  city text, neighborhood text, region text, condo_name text, bedrooms int, suites int,
  parking_total int, area numeric, area_useful numeric, area_built numeric, area_total numeric,
  price_sale numeric, price_rent numeric, image text, card_image_url text, total bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_phrase IS NULL THEN
    RETURN QUERY
    WITH b0 AS (
      SELECT p.id, p.slug, p.title, p.internal_code, p.purpose, p.property_type, p.city, p.neighborhood, p.region,
        p.condominium_name, p.condominium_id, p.bedrooms, p.suites, p.area_useful, p.area_built, p.area_total, p.price_sale, p.price_rent,
        p.images, p.card_image_url, p.last_seen_at,
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
        AND (p_condo_ids IS NULL OR b0.condominium_id = ANY(p_condo_ids))
        AND (p_condo = '' OR public.fuzzy_eq(COALESCE(b0.condo_official, b0.condominium_name), p_condo))
        AND (p_bedrooms = 0 OR COALESCE(b0.bedrooms,0) >= p_bedrooms)
        AND (p_parking = 0 OR b0.ptot >= p_parking)
        AND ((p_price_min = 0 AND p_price_max = 0) OR (b0.pval IS NOT NULL
             AND (p_price_min = 0 OR b0.pval >= p_price_min) AND (p_price_max = 0 OR b0.pval <= p_price_max)))
        AND (p_area_min = 0 OR b0.amax >= p_area_min)
    ), ranked AS (
      SELECT s.*, count(*) OVER () AS total FROM base s
      ORDER BY
        CASE WHEN p_sort IN ('price_asc', 'price_desc') THEN CASE WHEN (CASE WHEN p_purpose = 'rent' THEN s.price_rent WHEN p_purpose = 'sale' THEN s.price_sale ELSE COALESCE(NULLIF(s.price_sale,0),NULLIF(s.price_rent,0)) END) > 0 THEN 0 ELSE 1 END END ASC,
        CASE WHEN p_sort = 'price_asc' AND p_purpose NOT IN ('rent', 'sale') THEN CASE WHEN s.price_sale > 0 THEN 0 WHEN s.price_rent > 0 THEN 1 ELSE 2 END END ASC,
        CASE WHEN p_sort = 'price_asc' THEN CASE WHEN p_purpose = 'rent' THEN NULLIF(s.price_rent,0) WHEN p_purpose = 'sale' THEN NULLIF(s.price_sale,0) ELSE COALESCE(NULLIF(s.price_sale,0),NULLIF(s.price_rent,0)) END END ASC NULLS LAST,
        CASE WHEN p_sort = 'price_desc' THEN CASE WHEN p_purpose = 'rent' THEN NULLIF(s.price_rent,0) WHEN p_purpose = 'sale' THEN NULLIF(s.price_sale,0) ELSE COALESCE(NULLIF(s.price_sale,0),NULLIF(s.price_rent,0)) END END DESC NULLS LAST,
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
    FROM ranked r;
  ELSE
    RETURN QUERY
    WITH b0 AS (
      SELECT p.id, p.slug, p.title, p.internal_code, p.purpose, p.property_type, p.city, p.neighborhood, p.region,
        p.condominium_name, p.condominium_id, p.bedrooms, p.suites, p.area_useful, p.area_built, p.area_total, p.price_sale, p.price_rent,
        p.images, p.card_image_url, p.last_seen_at, p.search_hay, p.search_condo_norm, p.search_condo_num,
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
        AND (p_condo_ids IS NULL OR b0.condominium_id = ANY(p_condo_ids))
        AND (p_condo = '' OR public.fuzzy_eq(COALESCE(b0.condo_official, b0.condominium_name), p_condo))
        AND (p_bedrooms = 0 OR COALESCE(b0.bedrooms,0) >= p_bedrooms)
        AND (p_parking = 0 OR b0.ptot >= p_parking)
        AND ((p_price_min = 0 AND p_price_max = 0) OR (b0.pval IS NOT NULL
             AND (p_price_min = 0 OR b0.pval >= p_price_min) AND (p_price_max = 0 OR b0.pval <= p_price_max)))
        AND (p_area_min = 0 OR b0.amax >= p_area_min)
    ), pat AS (
      SELECT array_agg('%' || qt || '%') AS pats FROM unnest(p_tokens) qt
    ), cand AS (
      SELECT base.* FROM base CROSS JOIN pat
      WHERE (base.search_hay IS NOT NULL AND base.search_hay ILIKE ALL (pat.pats))
         OR (base.search_condo_norm IS NOT NULL AND base.search_condo_norm ILIKE ALL (pat.pats))
         OR (base.search_condo_num IS NOT NULL AND base.search_condo_num ILIKE ALL (pat.pats))
    ), m AS (
      SELECT cand.*,
        (cand.search_condo_norm ~ p_phrase) OR (cand.search_condo_num IS NOT NULL AND cand.search_condo_num ~ p_phrase) AS condo_m,
        cand.search_hay ~ p_phrase AS full_m,
        NOT EXISTS (
          SELECT 1 FROM unnest(p_tokens) qt
          WHERE regexp_replace(' ' || coalesce(cand.search_hay,'') || ' ' || coalesce(cand.search_condo_num,'') || ' ',
                  ' (r|rua|av|avenida|ave|al|alameda|tv|travessa|pc|pca|praca|rod|rodovia|estr|estrada|lgo|largo|via|de|da|do|das|dos|e)(?= )', ' ', 'g')
            !~ CASE WHEN qt ~ '^\d+$' OR length(qt) < 3 THEN ' ' || qt || ' ' ELSE ' ' || qt END
        ) AS tok_m
      FROM cand
    ), f AS (
      SELECT COALESCE(bool_or(condo_m), false) AS c, COALESCE(bool_or(full_m), false) AS fm FROM m
    ), sel AS (
      SELECT m.* FROM m, f
      WHERE (f.c AND m.condo_m) OR (NOT f.c AND f.fm AND m.full_m) OR (NOT f.c AND NOT f.fm AND m.tok_m)
    ), ranked AS (
      SELECT s.*, count(*) OVER () AS total FROM sel s
      ORDER BY
        CASE WHEN p_sort IN ('price_asc', 'price_desc') THEN CASE WHEN (CASE WHEN p_purpose = 'rent' THEN s.price_rent WHEN p_purpose = 'sale' THEN s.price_sale ELSE COALESCE(NULLIF(s.price_sale,0),NULLIF(s.price_rent,0)) END) > 0 THEN 0 ELSE 1 END END ASC,
        CASE WHEN p_sort = 'price_asc' AND p_purpose NOT IN ('rent', 'sale') THEN CASE WHEN s.price_sale > 0 THEN 0 WHEN s.price_rent > 0 THEN 1 ELSE 2 END END ASC,
        CASE WHEN p_sort = 'price_asc' THEN CASE WHEN p_purpose = 'rent' THEN NULLIF(s.price_rent,0) WHEN p_purpose = 'sale' THEN NULLIF(s.price_sale,0) ELSE COALESCE(NULLIF(s.price_sale,0),NULLIF(s.price_rent,0)) END END ASC NULLS LAST,
        CASE WHEN p_sort = 'price_desc' THEN CASE WHEN p_purpose = 'rent' THEN NULLIF(s.price_rent,0) WHEN p_purpose = 'sale' THEN NULLIF(s.price_sale,0) ELSE COALESCE(NULLIF(s.price_sale,0),NULLIF(s.price_rent,0)) END END DESC NULLS LAST,
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
    FROM ranked r;
  END IF;
END
$$;

GRANT EXECUTE ON FUNCTION public.search_properties(text,text,text,text,text,int,int,numeric,numeric,numeric,text,text,text[],int,int,uuid[]) TO anon, authenticated, service_role;

-- Condomínios oficiais com imóveis ativos, respeitando os demais filtros (para o multi-select).
CREATE OR REPLACE FUNCTION public.property_condo_facets(
  p_purpose text DEFAULT '', p_type text DEFAULT '', p_city text DEFAULT '',
  p_neighborhood text DEFAULT '', p_bedrooms int DEFAULT 0, p_parking int DEFAULT 0,
  p_price_min numeric DEFAULT 0, p_price_max numeric DEFAULT 0, p_area_min numeric DEFAULT 0
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH b0 AS (
  SELECT p.condominium_id, p.purpose, p.property_type, p.city, p.neighborhood, p.region, p.condominium_name,
    p.bedrooms,
    COALESCE(NULLIF(COALESCE(p.parking_covered,0) + COALESCE(p.parking_uncovered,0), 0), p.parking, 0) AS ptot,
    GREATEST(COALESCE(p.area_useful,0), COALESCE(p.area_built,0), COALESCE(p.area_total,0)) AS amax,
    CASE WHEN p_purpose = 'sale' THEN NULLIF(p.price_sale,0)
         WHEN p_purpose = 'rent' THEN NULLIF(p.price_rent,0)
         ELSE LEAST(NULLIF(p.price_sale,0), NULLIF(p.price_rent,0)) END AS pval,
    c.name AS condo_official
  FROM public.properties p
  JOIN public.condominiums c ON c.id = p.condominium_id
  WHERE p.status = 'active'
), base AS (
  SELECT b0.* FROM b0
  WHERE (p_purpose = '' OR b0.purpose = p_purpose OR b0.purpose = 'both' OR p_purpose = 'both')
    AND (p_type = '' OR public.fuzzy_eq(b0.property_type, p_type))
    AND (p_city = '' OR public.fuzzy_eq(b0.city, p_city))
    AND (p_neighborhood = '' OR public.fuzzy_eq(b0.neighborhood, p_neighborhood) OR public.fuzzy_eq(b0.region, p_neighborhood)
         OR public.fuzzy_eq(b0.condo_official, p_neighborhood) OR public.fuzzy_eq(b0.condominium_name, p_neighborhood))
    AND (p_bedrooms = 0 OR COALESCE(b0.bedrooms,0) >= p_bedrooms)
    AND (p_parking = 0 OR b0.ptot >= p_parking)
    AND ((p_price_min = 0 AND p_price_max = 0) OR (b0.pval IS NOT NULL
         AND (p_price_min = 0 OR b0.pval >= p_price_min) AND (p_price_max = 0 OR b0.pval <= p_price_max)))
    AND (p_area_min = 0 OR b0.amax >= p_area_min)
)
SELECT COALESCE(jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'slug', x.slug, 'n', x.n) ORDER BY x.name), '[]'::jsonb)
FROM (
  SELECT c.id, c.name, c.slug, count(*) AS n
  FROM base JOIN public.condominiums c ON c.id = base.condominium_id
  GROUP BY c.id, c.name, c.slug
) x
$$;

GRANT EXECUTE ON FUNCTION public.property_condo_facets(text,text,text,text,int,int,numeric,numeric,numeric) TO anon, authenticated, service_role;