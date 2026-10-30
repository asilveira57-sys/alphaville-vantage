CREATE OR REPLACE FUNCTION public.properties_search_hay_sync() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_condo text;
BEGIN
 IF NEW.condominium_id IS NOT NULL THEN SELECT c.name INTO v_condo FROM public.condominiums c WHERE c.id=NEW.condominium_id; END IF;
 NEW.search_condo_norm := public.search_norm(concat_ws(' ', v_condo, NEW.condominium_name));
 NEW.search_hay := public.search_norm(concat_ws(' ', NEW.title, NEW.condominium_name, v_condo, NEW.neighborhood, NEW.seo_title, NEW.city, NEW.region, NEW.description, NEW.descricao_seo));
 RETURN NEW;
END $$;