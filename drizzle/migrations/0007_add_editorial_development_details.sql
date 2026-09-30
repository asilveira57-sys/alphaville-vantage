ALTER TABLE public.editorial_pages
  ADD COLUMN IF NOT EXISTS development_details jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.editorial_pages.development_details IS 'Structured technical sheet, typologies, project moment, and S.A. Imoveis analysis for development pages.';