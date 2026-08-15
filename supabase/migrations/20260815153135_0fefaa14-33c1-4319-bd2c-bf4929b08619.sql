CREATE TABLE IF NOT EXISTS public.condominium_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias text NOT NULL,
  normalized_alias text NOT NULL UNIQUE,
  condominium_id uuid REFERENCES public.condominiums(id) ON DELETE CASCADE,
  is_not_condominium boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.condominium_aliases TO authenticated;
GRANT ALL ON public.condominium_aliases TO service_role;
GRANT SELECT ON public.condominium_aliases TO anon;

ALTER TABLE public.condominium_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Aliases public read" ON public.condominium_aliases FOR SELECT TO anon USING (true);
CREATE POLICY "Aliases auth read" ON public.condominium_aliases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage aliases" ON public.condominium_aliases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

CREATE TRIGGER condominium_aliases_updated_at BEFORE UPDATE ON public.condominium_aliases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_condominium_aliases_condo ON public.condominium_aliases(condominium_id);
CREATE INDEX IF NOT EXISTS idx_properties_condominium_id ON public.properties(condominium_id);
CREATE INDEX IF NOT EXISTS idx_properties_condominium_name ON public.properties(condominium_name);