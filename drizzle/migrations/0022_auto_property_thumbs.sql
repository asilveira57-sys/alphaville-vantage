CREATE OR REPLACE FUNCTION public.property_main_image(p_images jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT u FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_images)='array' THEN p_images ELSE '[]'::jsonb END) WITH ORDINALITY x(u,o)
  WHERE u ~ '^https?://' AND u !~* '(logo|favicon|whats|placeholder|topo_contato)' ORDER BY o LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.wsrv_url(p_url text, p_w int)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT 'https://wsrv.nl/?url=' ||
    replace(replace(replace(replace(replace(replace(regexp_replace(p_url,'^https?://',''),
      '%','%25'),'&','%26'),'?','%3F'),'#','%23'),'=','%3D'),' ','%20')
    || '&w=' || p_w || '&output=webp&q=78&we'
$$;

CREATE OR REPLACE FUNCTION public.properties_auto_thumbs()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE m text;
BEGIN
  m := public.property_main_image(NEW.images);
  IF m IS NULL THEN
    IF NEW.thumb_source IS NOT NULL OR NEW.card_image_url IS NOT NULL THEN
      NEW.card_image_url := NULL; NEW.large_image_url := NULL; NEW.thumb_source := NULL;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.card_image_url IS NULL OR NEW.thumb_source IS DISTINCT FROM m THEN
    NEW.card_image_url := public.wsrv_url(m, 600);
    NEW.large_image_url := public.wsrv_url(m, 1200);
    NEW.thumb_source := m;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_properties_auto_thumbs ON public.properties;
CREATE TRIGGER trg_properties_auto_thumbs BEFORE INSERT OR UPDATE OF images, card_image_url, large_image_url, thumb_source
ON public.properties FOR EACH ROW EXECUTE FUNCTION public.properties_auto_thumbs();