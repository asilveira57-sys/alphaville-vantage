CREATE TABLE public.search_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  channel text NOT NULL DEFAULT 'pdf',
  search_query text,
  search_url text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_count integer NOT NULL DEFAULT 0,
  property_ids text[] NOT NULL DEFAULT '{}',
  consent_contact boolean NOT NULL DEFAULT false,
  consent_text text,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.search_leads TO authenticated;
GRANT ALL ON public.search_leads TO service_role;
ALTER TABLE public.search_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read search leads" ON public.search_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));