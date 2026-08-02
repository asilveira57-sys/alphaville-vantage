DROP POLICY IF EXISTS "Authenticated can read subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Staff can read subscribers" ON public.newsletter_subscribers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='knowledge_base' AND cmd='SELECT' LOOP
    EXECUTE format('DROP POLICY %I ON public.knowledge_base', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Staff can read knowledge base" ON public.knowledge_base
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

REVOKE ALL ON public.knowledge_base FROM anon;
REVOKE ALL ON public.newsletter_subscribers FROM anon;
GRANT INSERT ON public.newsletter_subscribers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_base TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.knowledge_base TO service_role;
GRANT ALL ON public.newsletter_subscribers TO service_role;