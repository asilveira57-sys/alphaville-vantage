-- "Mais filtros" de /imoveis (20/11/2026) — já aplicado no banco de produção.
-- Registro do que foi criado; não precisa rodar de novo.

alter table public.properties
  add column if not exists features text[],     -- características (rótulos), da API Tokko
  add column if not exists category text,       -- estilo: terreo, sobrado, duplex, cobertura, garden, flat…
  add column if not exists furnishing text;     -- mobiliado | semi-mobiliado | sem-mobilia (etiqueta da API)
create index if not exists properties_features_gin on public.properties using gin (features);

-- Espelho de featureSlug (src/lib/property-features.ts): manter iguais.
create or replace function public.feature_slugs(f text[]) returns text[] language sql immutable parallel safe as $$
  select case when f is null then null else array(
    select btrim(regexp_replace(translate(lower(x), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9]+', '-', 'g'), '-')
    from unnest(f) x) end
$$;
alter table public.properties add column if not exists feature_slugs text[]
  generated always as (public.feature_slugs(features)) stored;
create index if not exists properties_feature_slugs_gin on public.properties using gin (feature_slugs);

-- search_properties: assinatura antiga substituída pela mesma + 4 parâmetros
--   p_suites integer default 0, p_categories text[] default null,
--   p_furnishing text[] default null, p_features text[] default null
-- e, nos dois ramos (com e sem texto), o "base" ganhou:
--   and (p_suites = 0 or coalesce(b0.suites,0) >= p_suites)
--   and (p_categories is null or cardinality(p_categories) = 0 or b0.category = any(p_categories))
--   and (p_furnishing is null or cardinality(p_furnishing) = 0 or b0.furnishing = any(p_furnishing))
--   and (p_features is null or cardinality(p_features) = 0 or b0.feature_slugs @> p_features)
-- Sem esses parâmetros o resultado é idêntico ao anterior (2.424 ativos em 20/11).

-- property_more_facets(mesmos filtros de search_properties, sem ordenação/paginação):
-- jsonb { suites: {"1".."4": n}, categories: {slug: n}, furnishing: {slug: n}, features: {rótulo: n} }.
-- Suítes/estilo/mobília contam ignorando o próprio filtro (OU); características contam dentro do resultado atual (E).
-- grant execute on function public.property_more_facets(...) to anon, authenticated;
