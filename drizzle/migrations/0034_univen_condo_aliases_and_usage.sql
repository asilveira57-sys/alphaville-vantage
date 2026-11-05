ALTER TABLE public.condominiums ADD COLUMN IF NOT EXISTS usage text CHECK (usage IN ('residencial','comercial','misto'));
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS univen_empreendimento text;

CREATE TABLE public.univen_condo_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL,
  normalized_tag text NOT NULL,
  usage text CHECK (usage IN ('residencial','comercial','misto')),
  condominium_id uuid REFERENCES public.condominiums(id) ON DELETE CASCADE,
  ignored boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX univen_condo_aliases_key ON public.univen_condo_aliases (normalized_tag, coalesce(usage, ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.univen_condo_aliases TO authenticated;
GRANT ALL ON public.univen_condo_aliases TO service_role;
ALTER TABLE public.univen_condo_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage univen aliases" ON public.univen_condo_aliases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER univen_condo_aliases_updated BEFORE UPDATE ON public.univen_condo_aliases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();