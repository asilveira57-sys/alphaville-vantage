CREATE TABLE public.financing_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  property_slug text,
  property_value numeric NOT NULL,
  down_payment numeric NOT NULL,
  down_payment_pct numeric NOT NULL,
  used_fgts boolean NOT NULL DEFAULT false,
  term_months integer NOT NULL,
  annual_rate numeric NOT NULL,
  amortization_system text NOT NULL CHECK (amortization_system IN ('price', 'sac')),
  financed_amount numeric NOT NULL,
  first_installment numeric NOT NULL,
  last_installment numeric NOT NULL,
  total_paid numeric NOT NULL,
  total_interest numeric NOT NULL,
  suggested_min_income numeric NOT NULL,
  lead_name text,
  lead_phone text,
  lead_email text,
  converted_to_lead boolean NOT NULL DEFAULT false,
  qualification_score integer NOT NULL DEFAULT 0,
  priority_level text NOT NULL DEFAULT 'initial' CHECK (priority_level IN ('high', 'medium', 'initial')),
  source text NOT NULL DEFAULT 'property_page_simulator',
  campaign text,
  medium text,
  referrer text,
  landing_page text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_financing_sim_property ON public.financing_simulations (property_id);
CREATE INDEX idx_financing_sim_created_at ON public.financing_simulations (created_at DESC);
CREATE INDEX idx_financing_sim_converted ON public.financing_simulations (converted_to_lead) WHERE converted_to_lead = true;

GRANT INSERT ON public.financing_simulations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financing_simulations TO authenticated;
GRANT ALL ON public.financing_simulations TO service_role;

ALTER TABLE public.financing_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a financing simulation"
  ON public.financing_simulations FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can read financing simulations"
  ON public.financing_simulations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Staff can update financing simulations"
  ON public.financing_simulations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE TRIGGER financing_simulations_updated_at
  BEFORE UPDATE ON public.financing_simulations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.financing_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_annual_rate numeric NOT NULL DEFAULT 11.2,
  min_down_payment_pct numeric NOT NULL DEFAULT 10,
  max_term_months integer NOT NULL DEFAULT 420,
  fgts_example_amount numeric NOT NULL DEFAULT 40000,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

INSERT INTO public.financing_settings (id) VALUES (1);

GRANT SELECT ON public.financing_settings TO anon;
GRANT SELECT, UPDATE ON public.financing_settings TO authenticated;
GRANT ALL ON public.financing_settings TO service_role;

ALTER TABLE public.financing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read financing settings"
  ON public.financing_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage financing settings"
  ON public.financing_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER financing_settings_updated_at
  BEFORE UPDATE ON public.financing_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();