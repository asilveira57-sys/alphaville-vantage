-- ============ MEDIA LIBRARY ============
CREATE TABLE public.media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL UNIQUE,
  url text NOT NULL,
  original_filename text NOT NULL,
  title text,
  alt_text text,
  caption text,
  description text,
  width integer,
  height integer,
  mime_type text,
  size_bytes bigint,
  folder text NOT NULL DEFAULT 'geral',
  is_decorative boolean NOT NULL DEFAULT false,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.media_library TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_library TO authenticated;
GRANT ALL ON public.media_library TO service_role;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_library_read" ON public.media_library FOR SELECT USING (true);
CREATE POLICY "media_library_write" ON public.media_library FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE INDEX idx_media_library_folder ON public.media_library(folder);
CREATE INDEX idx_media_library_created ON public.media_library(created_at DESC);
CREATE TRIGGER trg_media_library_updated BEFORE UPDATE ON public.media_library
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.media_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES public.media_library(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  content_id text NOT NULL,
  content_label text,
  usage_kind text NOT NULL DEFAULT 'inline',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (media_id, content_type, content_id, usage_kind)
);
GRANT SELECT ON public.media_usage TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_usage TO authenticated;
GRANT ALL ON public.media_usage TO service_role;
ALTER TABLE public.media_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_usage_read" ON public.media_usage FOR SELECT USING (true);
CREATE POLICY "media_usage_write" ON public.media_usage FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE INDEX idx_media_usage_media ON public.media_usage(media_id);

-- ============ CTA MANAGEMENT ============
CREATE TABLE public.cta_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_name text NOT NULL,
  title text NOT NULL,
  description text,
  button_label text,
  button_url text,
  secondary_button_label text,
  secondary_button_url text,
  image_url text,
  icon text,
  cta_type text NOT NULL DEFAULT 'atendimento_geral',
  variant text NOT NULL DEFAULT 'dark',
  conversion_context text,
  tracking_source text,
  allowed_content_types text[] NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cta_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cta_blocks TO authenticated;
GRANT ALL ON public.cta_blocks TO service_role;
ALTER TABLE public.cta_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cta_blocks_read" ON public.cta_blocks FOR SELECT USING (true);
CREATE POLICY "cta_blocks_write" ON public.cta_blocks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE TRIGGER trg_cta_blocks_updated BEFORE UPDATE ON public.cta_blocks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cta_defaults (
  content_type text PRIMARY KEY,
  cta_id uuid REFERENCES public.cta_blocks(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cta_defaults TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cta_defaults TO authenticated;
GRANT ALL ON public.cta_defaults TO service_role;
ALTER TABLE public.cta_defaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cta_defaults_read" ON public.cta_defaults FOR SELECT USING (true);
CREATE POLICY "cta_defaults_write" ON public.cta_defaults FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- ============ AUDIT LOG ============
CREATE TABLE public.cms_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_label text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.cms_audit_log TO authenticated;
GRANT ALL ON public.cms_audit_log TO service_role;
ALTER TABLE public.cms_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cms_audit_read" ON public.cms_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "cms_audit_insert" ON public.cms_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE INDEX idx_cms_audit_created ON public.cms_audit_log(created_at DESC);

-- ============ NEW OPTIONAL COLUMNS ============
ALTER TABLE public.editorial_pages
  ADD COLUMN IF NOT EXISTS meta_keywords text,
  ADD COLUMN IF NOT EXISTS social_image text,
  ADD COLUMN IF NOT EXISTS robots_index boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS robots_follow boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cta_id uuid REFERENCES public.cta_blocks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cta_hidden boolean NOT NULL DEFAULT false;

ALTER TABLE public.streets
  ADD COLUMN IF NOT EXISTS social_image text,
  ADD COLUMN IF NOT EXISTS robots_index boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS robots_follow boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS cta_id uuid REFERENCES public.cta_blocks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cta_hidden boolean NOT NULL DEFAULT false;