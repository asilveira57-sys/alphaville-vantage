-- Vitrine de Oportunidades — Fase 3
-- Captação de e-mail e WhatsApp para a lista de oportunidades.
--
-- O envio é manual por enquanto: esta tabela é a fonte da lista, e também
-- a prova do consentimento. A LGPD art. 8º §2º põe o ônus da prova no
-- controlador, e o §4º anula consentimento genérico — por isso guardamos o
-- texto exato exibido na tela, a versão da política e o canal aceito, um
-- por um.

CREATE TABLE IF NOT EXISTS public.opportunity_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  audience text NOT NULL DEFAULT 'investidor'
    CHECK (audience IN ('investidor', 'corretor_parceiro', 'comprador')),

  -- Preferências declaradas: região, tipologia, faixa de preço.
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Consentimento, granular por canal.
  consent_email boolean NOT NULL DEFAULT false,
  consent_whatsapp boolean NOT NULL DEFAULT false,
  consent_text text NOT NULL,
  policy_version text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  consent_ip text,
  consent_user_agent text,

  -- Controle operacional do envio manual.
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

COMMENT ON TABLE public.opportunity_subscribers IS
  'Lista de oportunidades. O envio é manual; esta tabela é a fonte e a prova do consentimento.';
COMMENT ON COLUMN public.opportunity_subscribers.consent_text IS
  'Texto exato exibido ao titular no momento do aceite. Sem isso não há prova (LGPD art. 8º §2º).';
COMMENT ON COLUMN public.opportunity_subscribers.broadcast_added_at IS
  'Quando o contato foi efetivamente incluído na lista de transmissão, à mão.';

-- Um cadastro por contato: quem se inscreve de novo atualiza o próprio registro.
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_subscribers_email
  ON public.opportunity_subscribers (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_subscribers_phone
  ON public.opportunity_subscribers (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunity_subscribers_pending
  ON public.opportunity_subscribers (created_at DESC)
  WHERE broadcast_added_at IS NULL AND unsubscribed_at IS NULL;

ALTER TABLE public.opportunity_subscribers ENABLE ROW LEVEL SECURITY;

-- Inscrição anônima, mas só com pelo menos um canal consentido. A regra de
-- negócio fica no banco, não só na aplicação.
DROP POLICY IF EXISTS "Anyone can subscribe to opportunities" ON public.opportunity_subscribers;
CREATE POLICY "Anyone can subscribe to opportunities"
  ON public.opportunity_subscribers FOR INSERT TO anon, authenticated
  WITH CHECK (consent_email OR consent_whatsapp);

-- Leitura só para staff. A base de contatos não é pública para qualquer
-- usuário autenticado — é o erro que já foi corrigido em newsletter_subscribers.
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
