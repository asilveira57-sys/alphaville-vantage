-- 17/11/2026 — Apelidos de busca por imóvel (properties.search_aliases).
-- Nomes que o cliente usa na busca mas que não são o bairro/condomínio oficial do imóvel
-- (ex.: "Green Valley", usado como bairro pela Univen). Entram em search_post e search_hay,
-- então a busca de /imoveis acha o imóvel, mas o nome não aparece em nenhum texto público.
-- Já aplicado no banco pelo conector SQL. Correção do bairro fica em manual_overrides.neighborhood
-- (a sincronização Tokko respeita).
alter table public.properties add column if not exists search_aliases text[] not null default '{}';

create or replace function public.properties_search_text() returns trigger language plpgsql as $f$
BEGIN
  NEW.search_pre := public.search_norm(concat_ws(' ', NEW.title, NEW.condominium_name));
  NEW.search_post := public.search_norm(concat_ws(' ', NEW.neighborhood, NEW.seo_title, NEW.city, NEW.region, NEW.description, NEW.descricao_seo, array_to_string(NEW.search_aliases, ' ')));
  RETURN NEW;
END $f$;

create or replace function public.properties_search_hay_sync() returns trigger language plpgsql as $f$
DECLARE v_condo text;
BEGIN
 IF NEW.condominium_id IS NOT NULL THEN SELECT c.name INTO v_condo FROM public.condominiums c WHERE c.id=NEW.condominium_id; END IF;
 NEW.search_condo_norm := public.search_norm(concat_ws(' ', v_condo, NEW.condominium_name));
 NEW.search_hay := public.search_norm(concat_ws(' ', NEW.title, NEW.condominium_name, v_condo, NEW.neighborhood, NEW.seo_title, NEW.city, NEW.region, NEW.description, NEW.descricao_seo, array_to_string(NEW.previous_codes, ' '), array_to_string(NEW.search_aliases, ' ')));
 RETURN NEW;
END $f$;

-- Os gatilhos "UPDATE OF <colunas>" só disparam quando a coluna está no SET do UPDATE
-- (não quando outro gatilho a altera): por isso a lista inclui os campos de texto.
drop trigger if exists properties_search_hay_sync on public.properties;
create trigger properties_search_hay_sync before insert or update of search_pre, search_post, condominium_id, condominium_name, previous_codes, search_aliases, title, neighborhood, seo_title, description, descricao_seo on public.properties for each row execute function properties_search_hay_sync();
drop trigger if exists trg_properties_search_text on public.properties;
create trigger trg_properties_search_text before insert or update of title, condominium_name, neighborhood, seo_title, city, region, description, descricao_seo, search_aliases on public.properties for each row execute function properties_search_text();
