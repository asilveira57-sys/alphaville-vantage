CREATE OR REPLACE FUNCTION public.properties_official_city() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text; seg text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.city IS NOT DISTINCT FROM OLD.city THEN RETURN NEW; END IF;
  IF NEW.city IS NOT NULL AND btrim(NEW.city) <> '' THEN
    SELECT c.name INTO v FROM cities c
     WHERE ' ' || regexp_replace(lower(unaccent(NEW.city)), '[^a-z0-9]+', ' ', 'g') || ' '
        LIKE '% ' || regexp_replace(lower(unaccent(c.name)), '[^a-z0-9]+', ' ', 'g') || ' %'
     ORDER BY length(c.name) DESC LIMIT 1;
  ELSIF NEW.source_url IS NOT NULL THEN
    seg := split_part(regexp_replace(NEW.source_url, '^https?://[^/]+/', ''), '/', 3);
    SELECT c.name INTO v FROM cities c WHERE c.slug = seg LIMIT 1;
  END IF;
  IF v IS NOT NULL THEN
    NEW.city := v;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO city_review_queue(property_id, raw_city, source_url, reason)
    VALUES (NEW.id, NEW.city, NEW.source_url, 'cidade fora da tabela oficial');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.properties_official_city_after_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cities WHERE name = NEW.city) THEN
    INSERT INTO city_review_queue(property_id, raw_city, source_url, reason)
    VALUES (NEW.id, NEW.city, NEW.source_url, 'cidade fora da tabela oficial');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_properties_official_city BEFORE INSERT OR UPDATE OF city ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.properties_official_city();
CREATE TRIGGER trg_properties_official_city_ai AFTER INSERT ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.properties_official_city_after_insert();