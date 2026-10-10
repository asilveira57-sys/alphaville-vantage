CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_label text NOT NULL,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  name text,
  phone text,
  email text,
  landing_page text,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','atendido')),
  handled_at timestamptz,
  handled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_table, source_id)
);
CREATE INDEX leads_created_idx ON public.leads (created_at DESC);
GRANT SELECT, UPDATE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read leads" ON public.leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update leads" ON public.leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.upsert_lead(p_source text, p_label text, p_table text, p_id uuid, p_name text, p_phone text, p_email text, p_page text, p_summary text, p_payload jsonb, p_created timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.leads (source, source_label, source_table, source_id, name, phone, email, landing_page, summary, payload, created_at)
  VALUES (p_source, p_label, p_table, p_id, p_name, p_phone, p_email, p_page, p_summary, COALESCE(p_payload,'{}'::jsonb), COALESCE(p_created, now()))
  ON CONFLICT (source_table, source_id) DO UPDATE SET
    source = EXCLUDED.source, source_label = EXCLUDED.source_label, name = EXCLUDED.name, phone = EXCLUDED.phone,
    email = EXCLUDED.email, landing_page = EXCLUDED.landing_page, summary = EXCLUDED.summary, payload = EXCLUDED.payload, updated_at = now();
END $$;
REVOKE EXECUTE ON FUNCTION public.upsert_lead(text,text,text,uuid,text,text,text,text,text,jsonb,timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.leads_from_newsletter() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.upsert_lead('newsletter','Newsletter','newsletter_subscribers',NEW.id,NULL,NULL,NEW.email,NULL,
    'Inscrição na newsletter' || COALESCE(' (' || NEW.source || ')',''), to_jsonb(NEW), NEW.created_at);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.leads_from_financing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.lead_name IS NULL AND NEW.lead_phone IS NULL AND NEW.lead_email IS NULL THEN RETURN NEW; END IF;
  PERFORM public.upsert_lead('financiamento','Financiamento','financing_simulations',NEW.id,NEW.lead_name,NEW.lead_phone,NEW.lead_email,NEW.landing_page,
    'Simulação: imóvel R$ ' || to_char(NEW.property_value,'FM999G999G999') || ', entrada R$ ' || to_char(NEW.down_payment,'FM999G999G999')
    || ', ' || NEW.term_months || ' meses, ' || NEW.amortization_system || COALESCE(', banco ' || NEW.bank_name,'')
    || COALESCE(', imóvel ' || NEW.property_slug,''), to_jsonb(NEW), NEW.created_at);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.leads_from_radar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_src text; v_label text;
BEGIN
  IF NEW.conversion_context LIKE 'partner\_%' THEN
    v_src := 'parceiro'; v_label := 'Parceiro: ' || substr(NEW.conversion_context, 9);
  ELSIF NEW.conversion_context LIKE 'empreendimento\_%' THEN
    v_src := 'empreendimento'; v_label := 'Empreendimento: ' || substr(NEW.conversion_context, 16);
  ELSE
    v_src := 'radar'; v_label := 'Radar';
  END IF;
  PERFORM public.upsert_lead(v_src, v_label,'real_estate_radar_leads',NEW.id,NEW.lead_name,NEW.lead_phone,NEW.lead_email,NEW.landing_page,
    COALESCE(NEW.profile_summary, NEW.interest_type), to_jsonb(NEW), NEW.created_at);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.leads_from_search() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.upsert_lead('pesquisa','Pesquisa Inteligente','search_leads',NEW.id,NEW.name,NEW.phone,NEW.email,NEW.search_url,
    'Pesquisa: ' || COALESCE(NULLIF(NEW.search_query,''),'filtros') || ' — ' || NEW.result_count || ' imóveis (via ' || NEW.channel || ')',
    to_jsonb(NEW) - 'ip_hash' - 'user_agent', NEW.created_at);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.leads_from_opportunity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.upsert_lead('oportunidades','Lista de Oportunidades','opportunity_subscribers',NEW.id,NEW.name,NEW.phone,NEW.email,NEW.landing_page,
    'Lista de oportunidades (' || NEW.audience || ')' || CASE WHEN NEW.filters <> '{}'::jsonb THEN ' — filtros: ' || NEW.filters::text ELSE '' END,
    to_jsonb(NEW) - 'consent_ip' - 'consent_user_agent', NEW.created_at);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_leads_newsletter AFTER INSERT OR UPDATE ON public.newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION public.leads_from_newsletter();
CREATE TRIGGER trg_leads_financing AFTER INSERT OR UPDATE ON public.financing_simulations FOR EACH ROW EXECUTE FUNCTION public.leads_from_financing();
CREATE TRIGGER trg_leads_radar AFTER INSERT OR UPDATE ON public.real_estate_radar_leads FOR EACH ROW EXECUTE FUNCTION public.leads_from_radar();
CREATE TRIGGER trg_leads_search AFTER INSERT OR UPDATE ON public.search_leads FOR EACH ROW EXECUTE FUNCTION public.leads_from_search();
CREATE TRIGGER trg_leads_opportunity AFTER INSERT OR UPDATE ON public.opportunity_subscribers FOR EACH ROW EXECUTE FUNCTION public.leads_from_opportunity();

-- backfill (touch rows so triggers fire)
UPDATE public.newsletter_subscribers SET updated_at = updated_at;
UPDATE public.financing_simulations SET updated_at = updated_at;
UPDATE public.real_estate_radar_leads SET updated_at = updated_at;
UPDATE public.opportunity_subscribers SET updated_at = updated_at;
INSERT INTO public.leads (source, source_label, source_table, source_id, name, phone, email, landing_page, summary, payload, created_at)
SELECT 'pesquisa','Pesquisa Inteligente','search_leads',s.id,s.name,s.phone,s.email,s.search_url,
  'Pesquisa: ' || COALESCE(NULLIF(s.search_query,''),'filtros') || ' — ' || s.result_count || ' imóveis (via ' || s.channel || ')',
  to_jsonb(s) - 'ip_hash' - 'user_agent', s.created_at
FROM public.search_leads s ON CONFLICT DO NOTHING;