CREATE TABLE public.development_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  description text,
  empreendimento_slugs text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.development_partners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.development_partners TO authenticated;
GRANT ALL ON public.development_partners TO service_role;
ALTER TABLE public.development_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active partners" ON public.development_partners FOR SELECT TO anon USING (active);
CREATE POLICY "Authenticated reads all partners" ON public.development_partners FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage partners" ON public.development_partners FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));