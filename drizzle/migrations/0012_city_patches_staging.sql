CREATE TABLE public.city_patches (id uuid PRIMARY KEY, city text NOT NULL);
GRANT ALL ON public.city_patches TO service_role;
ALTER TABLE public.city_patches ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.city_patches IS 'Staging interno da normalização de cidades.';