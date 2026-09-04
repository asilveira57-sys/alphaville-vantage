CREATE TABLE public.property_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL,
  source_label text NOT NULL DEFAULT 'S.A. Imóveis — Site atual',
  parser text NOT NULL DEFAULT 'sa-imoveis',
  external_code text,
  status text NOT NULL DEFAULT 'pending',
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  log jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  duplicates jsonb NOT NULL DEFAULT '[]'::jsonb,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  committed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_imports TO authenticated;
GRANT ALL ON public.property_imports TO service_role;

ALTER TABLE public.property_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage property imports"
ON public.property_imports FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE INDEX idx_property_imports_status ON public.property_imports (status, updated_at DESC);
CREATE INDEX idx_property_imports_url ON public.property_imports (source_url);

CREATE TRIGGER property_imports_updated_at
BEFORE UPDATE ON public.property_imports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();