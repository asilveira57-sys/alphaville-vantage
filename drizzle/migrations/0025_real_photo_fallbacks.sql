CREATE OR REPLACE FUNCTION public.is_real_image(u text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(btrim(u), '') <> ''
     AND u !~* '(logo|favicon|whats|placeholder|topo_contato)';
$$;

-- Latest active property photo for a condominium / street / neighborhood.
CREATE OR REPLACE FUNCTION public.latest_property_photo(_condo uuid, _street uuid, _neighborhood text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.card_image_url FROM public.properties p
  WHERE p.status = 'active' AND public.is_real_image(p.card_image_url)
    AND ( (_condo IS NOT NULL AND p.condominium_id = _condo)
       OR (_street IS NOT NULL AND p.street_id = _street)
       OR (_neighborhood IS NOT NULL AND btrim(_neighborhood) <> '' AND lower(p.neighborhood) = lower(btrim(_neighborhood))) )
  ORDER BY p.created_at DESC
  LIMIT 1;
$$;

-- Computed field: real card photo for an editorial page, or NULL (neutral background).
CREATE OR REPLACE FUNCTION public.card_image(e public.editorial_pages)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.is_real_image(e.featured_image) THEN e.featured_image
    WHEN e.content_type = 'condominio' THEN coalesce(
      (SELECT c.cover_image_url FROM public.condominiums c
        WHERE c.id = e.related_condominium AND public.is_real_image(c.cover_image_url)),
      public.latest_property_photo(e.related_condominium, NULL, NULL))
    WHEN e.content_type = 'bairro' THEN
      public.latest_property_photo(NULL, NULL, coalesce(nullif(btrim(e.bairro), ''), e.related_neighborhood))
    ELSE NULL
  END;
$$;

-- Computed field: real card photo for a street, or NULL.
CREATE OR REPLACE FUNCTION public.card_image(s public.streets)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.is_real_image(s.hero_image) THEN s.hero_image
    ELSE public.latest_property_photo(NULL, s.id, NULL)
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_real_image(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.latest_property_photo(uuid, uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.card_image(public.editorial_pages) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.card_image(public.streets) TO anon, authenticated, service_role;

-- When a condominium gains/changes its main photo, fill the guide's featured_image
-- if it is empty (or still holds the previous condominium photo copied automatically).
CREATE OR REPLACE FUNCTION public.condominiums_cover_to_guides()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_real_image(NEW.cover_image_url) THEN RETURN NEW; END IF;
  UPDATE public.editorial_pages e
     SET featured_image = NEW.cover_image_url
   WHERE e.related_condominium = NEW.id
     AND e.content_type = 'condominio'
     AND ( coalesce(btrim(e.featured_image), '') = ''
        OR (TG_OP = 'UPDATE' AND OLD.cover_image_url IS NOT NULL AND e.featured_image = OLD.cover_image_url) );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_condominiums_cover_to_guides ON public.condominiums;
CREATE TRIGGER trg_condominiums_cover_to_guides
AFTER INSERT OR UPDATE OF cover_image_url ON public.condominiums
FOR EACH ROW
WHEN (NEW.cover_image_url IS NOT NULL)
EXECUTE FUNCTION public.condominiums_cover_to_guides();

-- Admin report: everything that would show the neutral background.
CREATE OR REPLACE FUNCTION public.missing_real_photos()
RETURNS TABLE(kind text, id uuid, title text, slug text, status text, detail text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT CASE e.content_type WHEN 'condominio' THEN 'guia_condominio' WHEN 'blog' THEN 'post'
              WHEN 'bairro' THEN 'bairro' ELSE 'guia' END,
         e.id, e.title, e.slug, e.status,
         CASE WHEN e.content_type = 'condominio' AND e.related_condominium IS NULL
              THEN 'Sem condomínio vinculado' ELSE 'Sem foto principal' END
    FROM public.editorial_pages e
   WHERE e.status IN ('published', 'draft') AND public.card_image(e) IS NULL
  UNION ALL
  SELECT 'condominio', c.id, c.name, c.slug, c.status,
         'Sem foto principal e sem imóvel ativo com foto'
    FROM public.condominiums c
   WHERE NOT public.is_real_image(c.cover_image_url)
     AND public.latest_property_photo(c.id, NULL, NULL) IS NULL
  UNION ALL
  SELECT 'rua', s.id, coalesce(s.official_name, s.name), s.slug, s.status,
         'Sem foto da rua e sem imóvel ativo com foto'
    FROM public.streets s
   WHERE public.card_image(s) IS NULL
  UNION ALL
  SELECT 'imovel', p.id, coalesce(p.internal_code || ' — ', '') || p.title, p.slug, p.status,
         'Sem foto na origem'
    FROM public.properties p
   WHERE p.status = 'active' AND NOT public.is_real_image(p.card_image_url)
     AND NOT public.is_real_image(p.images->>0);
END;
$$;

REVOKE ALL ON FUNCTION public.missing_real_photos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.missing_real_photos() TO authenticated, service_role;