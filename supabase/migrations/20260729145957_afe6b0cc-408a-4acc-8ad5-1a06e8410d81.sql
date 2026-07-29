CREATE TABLE public.empreendimento_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_slug text NOT NULL,
  url text NOT NULL,
  title text,
  caption text,
  alt_text text,
  credit text,
  source text,
  sort_order integer NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_emp_media_slug ON public.empreendimento_media (empreendimento_slug, sort_order);
GRANT SELECT ON public.empreendimento_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empreendimento_media TO authenticated;
GRANT ALL ON public.empreendimento_media TO service_role;
ALTER TABLE public.empreendimento_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emp_media_public_read" ON public.empreendimento_media FOR SELECT TO anon USING (active = true);
CREATE POLICY "emp_media_auth_read" ON public.empreendimento_media FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_media_admin_all" ON public.empreendimento_media FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_emp_media_updated BEFORE UPDATE ON public.empreendimento_media FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.empreendimento_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_slug text NOT NULL,
  kind text NOT NULL DEFAULT 'planta',
  category text,
  title text,
  area_label text,
  description text,
  image_url text,
  thumb_url text,
  embed_url text,
  credit text,
  source text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT empreendimento_plans_kind_check CHECK (kind IN ('planta','implantacao','tour'))
);
CREATE INDEX idx_emp_plans_slug ON public.empreendimento_plans (empreendimento_slug, kind, sort_order);
GRANT SELECT ON public.empreendimento_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empreendimento_plans TO authenticated;
GRANT ALL ON public.empreendimento_plans TO service_role;
ALTER TABLE public.empreendimento_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emp_plans_public_read" ON public.empreendimento_plans FOR SELECT TO anon USING (active = true);
CREATE POLICY "emp_plans_auth_read" ON public.empreendimento_plans FOR SELECT TO authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "emp_plans_admin_all" ON public.empreendimento_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_emp_plans_updated BEFORE UPDATE ON public.empreendimento_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();