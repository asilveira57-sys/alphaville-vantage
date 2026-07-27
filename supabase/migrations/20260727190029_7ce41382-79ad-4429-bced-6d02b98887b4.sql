CREATE TABLE public.real_estate_radar_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  lead_name text NOT NULL,
  lead_phone text,
  lead_email text,
  lead_current_city text,
  interest_type text NOT NULL,
  preferred_contact_channel text,
  preferred_contact_period text,
  status text NOT NULL DEFAULT 'radar_recebido',
  priority_level text NOT NULL DEFAULT 'initial',
  qualification_score integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'homepage_radar',
  campaign text,
  medium text,
  content text,
  term text,
  referrer text,
  landing_page text,
  conversion_context text NOT NULL DEFAULT 'real_estate_radar',
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  profile_summary text,
  recommended_next_step text,
  privacy_consent boolean NOT NULL DEFAULT false,
  privacy_consent_at timestamp with time zone,
  form_version text NOT NULL DEFAULT 'radar_v1',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_radar_leads_created_at ON public.real_estate_radar_leads (created_at DESC);
CREATE INDEX idx_radar_leads_interest ON public.real_estate_radar_leads (interest_type);
CREATE UNIQUE INDEX idx_radar_leads_phone ON public.real_estate_radar_leads (lead_phone) WHERE lead_phone IS NOT NULL;
CREATE UNIQUE INDEX idx_radar_leads_email ON public.real_estate_radar_leads (lower(lead_email)) WHERE lead_email IS NOT NULL;

GRANT INSERT ON public.real_estate_radar_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.real_estate_radar_leads TO authenticated;
GRANT ALL ON public.real_estate_radar_leads TO service_role;

ALTER TABLE public.real_estate_radar_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a radar lead"
  ON public.real_estate_radar_leads FOR INSERT TO anon, authenticated
  WITH CHECK (privacy_consent = true);

CREATE POLICY "Staff can read radar leads"
  ON public.real_estate_radar_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Staff can update radar leads"
  ON public.real_estate_radar_leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins can delete radar leads"
  ON public.real_estate_radar_leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_radar_leads_updated_at
  BEFORE UPDATE ON public.real_estate_radar_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();