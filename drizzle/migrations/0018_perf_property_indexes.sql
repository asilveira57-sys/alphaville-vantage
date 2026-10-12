CREATE INDEX IF NOT EXISTS idx_properties_status_last_seen ON public.properties(status, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_slug ON public.properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_status_neighborhood ON public.properties(status, neighborhood);