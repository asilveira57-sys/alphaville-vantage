CREATE OR REPLACE FUNCTION public.home_region_counts()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'alphaville', count(*) FILTER (WHERE region ILIKE '%alphaville%' OR city ILIKE '%alphaville%' OR neighborhood ILIKE '%alphaville%'),
    'tambore',    count(*) FILTER (WHERE region ILIKE '%tambor%' OR city ILIKE '%tambor%' OR neighborhood ILIKE '%tambor%'),
    'barueri',    count(*) FILTER (WHERE region ILIKE '%barueri%' OR city ILIKE '%barueri%' OR neighborhood ILIKE '%barueri%'),
    'santana',    count(*) FILTER (WHERE region ILIKE '%santana%' OR city ILIKE '%santana%' OR neighborhood ILIKE '%santana%')
  )
  FROM public.properties
  WHERE status = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.home_region_counts() TO anon, authenticated, service_role;