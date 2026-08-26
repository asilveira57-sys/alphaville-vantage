-- Vitrine de Oportunidades — Fase 4
-- Área de parceiros e mídia kit.
--
-- A Resolução COFECI 458/95 art. 1º só admite anúncio público por quem tem
-- contrato escrito de intermediação, e a responsabilidade pela publicidade é
-- conjunta entre quem anuncia e quem divulga. Por isso o acesso é
-- identificado, condicionado ao aceite do termo, e cada download fica
-- registrado — se um material desatualizado circular, dá para saber quem o
-- baixou e avisar.

-- ------------------------------------------------------------------- role

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'parceiro'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'parceiro';
  END IF;
END $$;

-- ---------------------------------------------------------------- cadastro

CREATE TABLE IF NOT EXISTS public.partner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  company text,
  creci text NOT NULL,
  phone text NOT NULL,
  email text,

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,

  -- Aceite do termo de adesão: quem divulga responde junto pela publicidade.
  agreement_version text,
  agreement_accepted_at timestamptz,
  agreement_ip text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.partner_profiles.creci IS
  'CRECI do parceiro. Exigência da Resolução COFECI 458/95 art. 2º para quem anuncia.';
COMMENT ON COLUMN public.partner_profiles.agreement_accepted_at IS
  'Sem aceite não há acesso ao mídia kit — o termo é o que declara o contrato de intermediação.';

CREATE INDEX IF NOT EXISTS idx_partner_profiles_status
  ON public.partner_profiles (status, created_at DESC);

ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;

-- O parceiro lê e cria apenas o próprio cadastro.
DROP POLICY IF EXISTS "Partners read own profile" ON public.partner_profiles;
CREATE POLICY "Partners read own profile"
  ON public.partner_profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'editor'::public.app_role)
  );

DROP POLICY IF EXISTS "Partners create own profile" ON public.partner_profiles;
CREATE POLICY "Partners create own profile"
  ON public.partner_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Aprovar, rejeitar ou revogar é decisão da equipe, nunca do próprio parceiro.
DROP POLICY IF EXISTS "Staff manage partner profiles" ON public.partner_profiles;
CREATE POLICY "Staff manage partner profiles"
  ON public.partner_profiles FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'editor'::public.app_role)
  );

DROP TRIGGER IF EXISTS trg_partner_profiles_touch ON public.partner_profiles;
CREATE TRIGGER trg_partner_profiles_touch
  BEFORE UPDATE ON public.partner_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_opportunity_subscribers();

-- ------------------------------------------------------- log de download

CREATE TABLE IF NOT EXISTS public.media_kit_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.partner_profiles(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('view', 'print', 'copy_text', 'copy_images')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.media_kit_access_log IS
  'Quem acessou o material de qual imóvel e quando. Serve para avisar os '
  'parceiros certos quando um imóvel sai da vitrine ou é vendido.';

CREATE INDEX IF NOT EXISTS idx_media_kit_log_property
  ON public.media_kit_access_log (property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_kit_log_partner
  ON public.media_kit_access_log (partner_id, created_at DESC);

ALTER TABLE public.media_kit_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read media kit log" ON public.media_kit_access_log;
CREATE POLICY "Staff read media kit log"
  ON public.media_kit_access_log FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'editor'::public.app_role)
  );

-- Escrita só pelo servidor (service_role), nunca direto do navegador.
