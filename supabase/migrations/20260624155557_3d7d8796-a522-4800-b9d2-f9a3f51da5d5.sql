ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS descricao_original TEXT,
  ADD COLUMN IF NOT EXISTS descricao_seo TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seo_used_ai BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_properties_seo_generated_at ON public.properties (seo_generated_at);