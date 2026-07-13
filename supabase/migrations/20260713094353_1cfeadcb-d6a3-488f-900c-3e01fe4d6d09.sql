
REVOKE EXECUTE ON FUNCTION public.match_property_streets(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_property_streets(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.match_property_streets(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.match_property_streets(uuid) TO service_role;
