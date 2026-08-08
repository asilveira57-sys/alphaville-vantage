ALTER TABLE public.editorial_pages
  ADD COLUMN IF NOT EXISTS properties_condo_terms text[] NOT NULL DEFAULT '{}';