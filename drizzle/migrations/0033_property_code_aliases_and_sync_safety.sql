ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS previous_codes text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS properties_previous_codes_gin ON public.properties USING gin (previous_codes);
ALTER TABLE public.source_reconciliation_runs ADD COLUMN IF NOT EXISTS pending_deactivation jsonb;
ALTER TABLE public.source_reconciliation_runs ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.source_reconciliation_runs ADD COLUMN IF NOT EXISTS alerts jsonb;

CREATE OR REPLACE FUNCTION public.properties_search_hay_sync() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_condo text;
BEGIN
 IF NEW.condominium_id IS NOT NULL THEN SELECT c.name INTO v_condo FROM public.condominiums c WHERE c.id=NEW.condominium_id; END IF;
 NEW.search_condo_norm := public.search_norm(concat_ws(' ', v_condo, NEW.condominium_name));
 NEW.search_hay := public.search_norm(concat_ws(' ', NEW.title, NEW.condominium_name, v_condo, NEW.neighborhood, NEW.seo_title, NEW.city, NEW.region, NEW.description, NEW.descricao_seo, array_to_string(NEW.previous_codes, ' ')));
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS properties_search_hay_sync ON public.properties;
CREATE TRIGGER properties_search_hay_sync BEFORE INSERT OR UPDATE OF search_pre, search_post, condominium_id, condominium_name, previous_codes ON public.properties FOR EACH ROW EXECUTE FUNCTION public.properties_search_hay_sync();