CREATE TABLE public.recrawl_patches (id uuid PRIMARY KEY, patch jsonb NOT NULL, applied_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.recrawl_patches TO service_role;
ALTER TABLE public.recrawl_patches ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.recrawl_patches IS 'Staging de alterações aprovadas da recaptura (somente uso interno).';