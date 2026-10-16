CREATE TABLE public.email_template_settings (
  template_name text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  subject text, heading text, intro text, outro text,
  cta_label text, cta_url text, recipient_override text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_template_settings TO authenticated;
GRANT ALL ON public.email_template_settings TO service_role;
ALTER TABLE public.email_template_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage email settings" ON public.email_template_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.email_dispatch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  recipient text NOT NULL,
  lead_id uuid,
  status text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_dispatch_log_created_idx ON public.email_dispatch_log(created_at DESC);
GRANT SELECT ON public.email_dispatch_log TO authenticated;
GRANT ALL ON public.email_dispatch_log TO service_role;
ALTER TABLE public.email_dispatch_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read email log" ON public.email_dispatch_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));