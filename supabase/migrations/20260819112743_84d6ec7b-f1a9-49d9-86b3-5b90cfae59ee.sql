CREATE OR REPLACE FUNCTION public.properties_rematch_street()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.condominiums_rematch_properties()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;