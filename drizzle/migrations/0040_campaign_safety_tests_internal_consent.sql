ALTER TABLE public.email_contacts ADD COLUMN consentimento_interno_log jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE TABLE public.email_campaign_tests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id), requested_by uuid NOT NULL, recipient text NOT NULL, provider_id text UNIQUE, status text NOT NULL DEFAULT 'pendente', error text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.email_campaign_tests TO authenticated;
GRANT ALL ON public.email_campaign_tests TO service_role;
ALTER TABLE public.email_campaign_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_tests_admin ON public.email_campaign_tests TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.email_reserved_domain(address text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT coalesce(lower(split_part(trim(address),'@',2)) !~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$' OR lower(split_part(trim(address),'@',2)) ~ '(^|\.)(test|localhost|local|invalid|example|internal|lan)$' OR lower(split_part(trim(address),'@',2)) ~ '(^|\.)example\.(com|net|org)$' OR lower(split_part(trim(address),'@',2)) ~ '^([0-9]+\.)+[0-9]+$',true) $$;
CREATE OR REPLACE FUNCTION public.email_register_internal_consent(cid uuid, reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE actor text; BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito ao administrador'; END IF;
 IF length(trim(reason)) < 10 OR length(reason)>2000 THEN RAISE EXCEPTION 'Informe o motivo (10 a 2000 caracteres)'; END IF;
 SELECT email INTO actor FROM auth.users WHERE id=auth.uid();
 UPDATE public.email_contacts SET consentimento_texto=trim(reason),consentimento_data=now(), consentimento_interno_log=consentimento_interno_log || jsonb_build_array(jsonb_build_object('admin_id',auth.uid(),'admin_email',actor,'quando',now(),'motivo',trim(reason))), status=CASE WHEN validacao='valido' OR (validacao='arriscado' AND risco_liberado) THEN 'ativo' ELSE 'inativo' END, tags=array_remove(array_remove(tags,'teste'),'consentimento_pendente'),updated_at=now()
 WHERE id=cid AND status NOT IN ('descadastrado','reclamou','rejeitado','invalido') AND NOT public.email_reserved_domain(email);
 IF NOT FOUND THEN RAISE EXCEPTION 'Contato inexistente, suprimido ou domínio reservado'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.email_register_internal_consent(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.email_register_internal_consent(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.email_enqueue_campaign(cid uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer; tag_filter text; BEGIN
 SELECT audience_tag INTO tag_filter FROM email_campaigns WHERE id=cid AND status IN ('rascunho','pausada') FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Campanha não pode ser iniciada'; END IF;
 INSERT INTO email_sends(campaign_id,contact_id) SELECT cid,id FROM email_contacts WHERE status='ativo' AND consentimento_data IS NOT NULL AND nullif(consentimento_texto,'') IS NOT NULL AND (validacao='valido' OR (validacao='arriscado' AND risco_liberado)) AND NOT ('teste'=ANY(tags)) AND NOT public.email_reserved_domain(email) AND (tag_filter IS NULL OR tag_filter=ANY(tags)) ORDER BY data_cadastro_original DESC ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF NOT EXISTS(SELECT 1 FROM email_sends WHERE campaign_id=cid AND status='pendente') THEN RAISE EXCEPTION 'Nenhum contato elegível: campanha não iniciada. Confira consentimento, validação e domínio'; END IF;
 UPDATE email_campaigns SET status='enviando',pause_reason=NULL,started_at=coalesce(started_at,now()),updated_at=now() WHERE id=cid; RETURN n;
END $$;