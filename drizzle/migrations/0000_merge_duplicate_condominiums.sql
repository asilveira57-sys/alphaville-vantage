DO $$
DECLARE r record; keeper uuid; dup uuid;
BEGIN
  FOR r IN
    SELECT lower(public.unaccent(name)) AS k
    FROM public.condominiums
    GROUP BY 1 HAVING count(*) > 1
  LOOP
    SELECT id INTO keeper FROM public.condominiums c
      WHERE lower(public.unaccent(c.name)) = r.k
      ORDER BY (SELECT count(*) FROM public.properties p WHERE p.condominium_id = c.id) DESC, c.created_at ASC
      LIMIT 1;
    FOR dup IN SELECT id FROM public.condominiums c
      WHERE lower(public.unaccent(c.name)) = r.k AND c.id <> keeper
    LOOP
      UPDATE public.properties SET condominium_id = keeper WHERE condominium_id = dup;
      UPDATE public.editorial_pages SET related_condominium = keeper WHERE related_condominium = dup;
      UPDATE public.condominium_aliases a SET condominium_id = keeper
        WHERE a.condominium_id = dup
          AND NOT EXISTS (SELECT 1 FROM public.condominium_aliases b WHERE b.condominium_id = keeper AND b.normalized_alias = a.normalized_alias);
      DELETE FROM public.condominium_aliases WHERE condominium_id = dup;
      DELETE FROM public.condominiums WHERE id = dup;
    END LOOP;
  END LOOP;
END $$;
