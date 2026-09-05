CREATE TABLE public.property_price_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  source_url text,
  field text NOT NULL,
  current_value numeric,
  found_raw text,
  found_value numeric,
  ratio numeric,
  status text NOT NULL,
  reason text,
  applied boolean NOT NULL DEFAULT false,
  applied_at timestamptz,
  applied_by uuid REFERENCES auth.users(id),
  reverted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_price_audit TO authenticated;
GRANT ALL ON public.property_price_audit TO service_role;

ALTER TABLE public.property_price_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage price audit"
ON public.property_price_audit FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE INDEX idx_price_audit_run_status ON public.property_price_audit (run_id, status);
CREATE INDEX idx_price_audit_property ON public.property_price_audit (property_id);