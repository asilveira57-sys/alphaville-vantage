ALTER TABLE public.properties
 ADD COLUMN IF NOT EXISTS listing_price numeric GENERATED ALWAYS AS (COALESCE(CASE WHEN price_sale > 0 THEN price_sale END, CASE WHEN price_rent > 0 THEN price_rent END)) STORED,
 ADD COLUMN IF NOT EXISTS listing_sale_group integer GENERATED ALWAYS AS (CASE WHEN price_sale > 0 THEN 0 WHEN price_rent > 0 THEN 1 ELSE 2 END) STORED,
 ADD COLUMN IF NOT EXISTS listing_rent_price numeric GENERATED ALWAYS AS (CASE WHEN price_rent > 0 THEN price_rent END) STORED;
CREATE INDEX IF NOT EXISTS properties_listing_order ON public.properties (listing_sale_group, listing_price, id) WHERE status = 'active';
DO $migration$
DECLARE definition text;
BEGIN
 definition := pg_get_functiondef('public.search_properties(text,text,text,text,text,integer,integer,numeric,numeric,numeric,text,text,text[],integer,integer)'::regprocedure);
 definition := replace(definition, 'p_sort text DEFAULT ''recent''::text', 'p_sort text DEFAULT ''price_asc''::text');
 definition := replace(definition,
 'CASE WHEN p_sort = ''price_asc'' THEN COALESCE(s.price_sale, s.price_rent) END ASC NULLS LAST,',
 'CASE WHEN p_sort IN (''price_asc'', ''price_desc'') THEN CASE WHEN (CASE WHEN p_purpose = ''rent'' THEN s.price_rent WHEN p_purpose = ''sale'' THEN s.price_sale ELSE COALESCE(NULLIF(s.price_sale,0),NULLIF(s.price_rent,0)) END) > 0 THEN 0 ELSE 1 END END ASC,
 CASE WHEN p_sort = ''price_asc'' AND p_purpose NOT IN (''rent'', ''sale'') THEN CASE WHEN s.price_sale > 0 THEN 0 WHEN s.price_rent > 0 THEN 1 ELSE 2 END END ASC,
 CASE WHEN p_sort = ''price_asc'' THEN CASE WHEN p_purpose = ''rent'' THEN NULLIF(s.price_rent,0) WHEN p_purpose = ''sale'' THEN NULLIF(s.price_sale,0) ELSE COALESCE(NULLIF(s.price_sale,0),NULLIF(s.price_rent,0)) END END ASC NULLS LAST,');
 definition := replace(definition,
 'CASE WHEN p_sort = ''price_desc'' THEN COALESCE(s.price_sale, s.price_rent, 0) END DESC,',
 'CASE WHEN p_sort = ''price_desc'' THEN CASE WHEN p_purpose = ''rent'' THEN NULLIF(s.price_rent,0) WHEN p_purpose = ''sale'' THEN NULLIF(s.price_sale,0) ELSE COALESCE(NULLIF(s.price_sale,0),NULLIF(s.price_rent,0)) END END DESC NULLS LAST,');
 EXECUTE definition;
END
$migration$;