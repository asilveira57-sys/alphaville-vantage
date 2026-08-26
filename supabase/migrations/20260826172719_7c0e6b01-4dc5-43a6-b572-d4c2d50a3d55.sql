CREATE TABLE IF NOT EXISTS public.opportunity_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  audience text NOT NULL DEFAULT 'investidor'
    CHECK (audience IN ('investidor', 'corretor_parceiro', 'comprador')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  consent_email boolean NOT NULL DEFAULT false,
  consent_whatsapp boolean NOT NULL DEFAULT false,
  consent_text text NOT NULL,
  policy_version text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  consent_ip text,
  consent_user_agent text,
  broadcast_added_at timestamptz,
  unsubscribed_at timestamptz,
  notes text,
  source text NOT NULL DEFAULT 'oportunidades',
  campaign text,
  referrer text,
  landing_page text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT opportunity_subscribers_contact_required
    CHECK (email IS NOT NULL OR phone IS NOT NULL),
  CONSTRAINT opportunity_subscribers_channel_required
    CHECK (consent_email OR consent_whatsapp),
  CONSTRAINT opportunity_subscribers_email_needs_address
    CHECK (NOT consent_email OR email IS NOT NULL),
  CONSTRAINT opportunity_subscribers_whatsapp_needs_phone
    CHECK (NOT consent_whatsapp OR phone IS NOT NULL)
);

GRANT INSERT ON public.opportunity_subscribers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_subscribers TO authenticated;
GRANT ALL ON public.opportunity_subscribers TO service_role;

COMMENT ON TABLE public.opportunity_subscribers IS
  'Lista de oportunidades. O envio é manual; esta tabela é a fonte e a prova do consentimento.';
COMMENT ON COLUMN public.opportunity_subscribers.consent_text IS
  'Texto exato exibido ao titular no momento do aceite. Sem isso não há prova (LGPD art. 8 par. 2).';
COMMENT ON COLUMN public.opportunity_subscribers.broadcast_added_at IS
  'Quando o contato foi efetivamente incluído na lista de transmissão, à mão.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_subscribers_email
  ON public.opportunity_subscribers (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_subscribers_phone
  ON public.opportunity_subscribers (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunity_subscribers_pending
  ON public.opportunity_subscribers (created_at DESC)
  WHERE broadcast_added_at IS NULL AND unsubscribed_at IS NULL;

ALTER TABLE public.opportunity_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can subscribe to opportunities" ON public.opportunity_subscribers;
CREATE POLICY "Anyone can subscribe to opportunities"
  ON public.opportunity_subscribers FOR INSERT TO anon, authenticated
  WITH CHECK (consent_email OR consent_whatsapp);

DROP POLICY IF EXISTS "Staff read opportunity subscribers" ON public.opportunity_subscribers;
CREATE POLICY "Staff read opportunity subscribers"
  ON public.opportunity_subscribers FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'editor'::public.app_role)
  );

DROP POLICY IF EXISTS "Staff update opportunity subscribers" ON public.opportunity_subscribers;
CREATE POLICY "Staff update opportunity subscribers"
  ON public.opportunity_subscribers FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'editor'::public.app_role)
  );

DROP POLICY IF EXISTS "Admins delete opportunity subscribers" ON public.opportunity_subscribers;
CREATE POLICY "Admins delete opportunity subscribers"
  ON public.opportunity_subscribers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.touch_opportunity_subscribers()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opportunity_subscribers_touch ON public.opportunity_subscribers;
CREATE TRIGGER trg_opportunity_subscribers_touch
  BEFORE UPDATE ON public.opportunity_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.touch_opportunity_subscribers();