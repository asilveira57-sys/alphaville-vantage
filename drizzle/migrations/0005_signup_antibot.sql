CREATE TABLE public.signup_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.signup_attempts TO service_role;

ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signup_attempts admin read" ON public.signup_attempts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX signup_attempts_ip_kind_idx ON public.signup_attempts (ip_hash, kind, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_norm_idx
  ON public.newsletter_subscribers (lower(btrim(email)));

CREATE UNIQUE INDEX IF NOT EXISTS opportunity_subscribers_email_norm_idx
  ON public.opportunity_subscribers (lower(btrim(email))) WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS opportunity_subscribers_phone_norm_idx
  ON public.opportunity_subscribers (regexp_replace(phone, '\D', '', 'g')) WHERE phone IS NOT NULL;
