-- Leitura de mídia restrita a admin/editor
DROP POLICY IF EXISTS media_library_read ON public.media_library;
CREATE POLICY media_library_read ON public.media_library
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

DROP POLICY IF EXISTS media_usage_read ON public.media_usage;
CREATE POLICY media_usage_read ON public.media_usage
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Remove permissões desnecessárias do papel anônimo
REVOKE ALL ON public.media_library FROM anon;
REVOKE ALL ON public.media_usage FROM anon;
REVOKE ALL ON public.cms_audit_log FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.cta_blocks FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.cta_defaults FROM anon;

GRANT SELECT ON public.cta_blocks TO anon;
GRANT SELECT ON public.cta_defaults TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_usage TO authenticated;
GRANT SELECT, INSERT ON public.cms_audit_log TO authenticated;
GRANT ALL ON public.media_library TO service_role;
GRANT ALL ON public.media_usage TO service_role;
GRANT ALL ON public.cms_audit_log TO service_role;