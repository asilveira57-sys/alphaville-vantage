ALTER TABLE public.editorial_pages
  ADD COLUMN IF NOT EXISTS properties_block_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS properties_block_title text,
  ADD COLUMN IF NOT EXISTS properties_included_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS properties_excluded_ids uuid[] NOT NULL DEFAULT '{}';