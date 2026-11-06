CREATE TABLE public.email_contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE CHECK (email=lower(trim(email))), nome text NOT NULL DEFAULT '', origem text NOT NULL DEFAULT 'csv', data_cadastro_original timestamptz NOT NULL DEFAULT now(), status text NOT NULL DEFAULT 'inativo' CHECK (status IN ('ativo','inativo','descadastrado','rejeitado','reclamou','invalido')), consentimento_texto text, consentimento_data timestamptz, consentimento_ip text, tags text[] NOT NULL DEFAULT '{}', validacao text NOT NULL DEFAULT 'valido' CHECK(validacao IN ('valido','arriscado','invalido')), risco_liberado boolean NOT NULL DEFAULT false, ultimo_envio timestamptz, ultima_abertura timestamptz, ultimo_clique timestamptz, envios_sem_abrir integer NOT NULL DEFAULT 0, descadastrado_em timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_contacts TO authenticated; GRANT ALL ON public.email_contacts TO service_role;
ALTER TABLE public.email_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_contacts_admin ON public.email_contacts FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.email_campaigns (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, slug text NOT NULL UNIQUE, assunto text NOT NULL, blocks jsonb NOT NULL DEFAULT '[]', audience_tag text, status text NOT NULL DEFAULT 'rascunho' CHECK(status IN ('rascunho','enviando','pausada','concluida')), pause_reason text, created_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated; GRANT ALL ON public.email_campaigns TO service_role;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_campaigns_admin ON public.email_campaigns FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.email_marketing_settings (id boolean PRIMARY KEY DEFAULT true CHECK(id), daily_limit integer NOT NULL DEFAULT 1000 CHECK(daily_limit BETWEEN 1 AND 100000), batch_size integer NOT NULL DEFAULT 100 CHECK(batch_size BETWEEN 1 AND 100), requests_per_second integer NOT NULL DEFAULT 1 CHECK(requests_per_second BETWEEN 1 AND 10), sending_enabled boolean NOT NULL DEFAULT false, lease_until timestamptz, lease_owner uuid, last_request_at timestamptz, admin_alert text, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.email_marketing_settings TO authenticated; GRANT ALL ON public.email_marketing_settings TO service_role;
ALTER TABLE public.email_marketing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_marketing_settings_admin ON public.email_marketing_settings FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.email_batches (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id), status text NOT NULL DEFAULT 'prepared', payload jsonb, provider_result jsonb, error text, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz);
GRANT SELECT ON public.email_batches TO authenticated; GRANT ALL ON public.email_batches TO service_role;
ALTER TABLE public.email_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_batches_admin ON public.email_batches FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.email_sends (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id), contact_id uuid NOT NULL REFERENCES public.email_contacts(id), batch_id uuid REFERENCES public.email_batches(id), status text NOT NULL DEFAULT 'pendente', provider_id text UNIQUE, sent_at timestamptz, delivered_at timestamptz, opened_at timestamptz, clicked_at timestamptz, bounced_at timestamptz, complained_at timestamptz, unsubscribed_at timestamptz, error text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(campaign_id,contact_id));
GRANT SELECT ON public.email_sends TO authenticated; GRANT ALL ON public.email_sends TO service_role;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_sends_admin ON public.email_sends FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE INDEX email_sends_pending ON public.email_sends(status,campaign_id,created_at); CREATE INDEX email_contacts_tags ON public.email_contacts USING gin(tags);
CREATE TABLE public.email_marketing_events (id text PRIMARY KEY, type text NOT NULL, provider_id text NOT NULL, occurred_at timestamptz NOT NULL, processed_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.email_marketing_events TO authenticated; GRANT ALL ON public.email_marketing_events TO service_role;
ALTER TABLE public.email_marketing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_marketing_events_admin ON public.email_marketing_events FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.email_contact_merge(p jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid;
BEGIN
 INSERT INTO public.email_contacts(email,nome,origem,data_cadastro_original,status,consentimento_texto,consentimento_data,consentimento_ip,tags,validacao)
 VALUES(lower(trim(p->>'email')),coalesce(p->>'nome',''),coalesce(p->>'origem','csv'),coalesce(nullif(p->>'data_cadastro_original','')::timestamptz,now()),CASE WHEN p->>'validacao'='arriscado' OR nullif(p->>'consentimento_texto','') IS NULL OR nullif(p->>'consentimento_data','') IS NULL THEN 'inativo' ELSE 'ativo' END,p->>'consentimento_texto',nullif(p->>'consentimento_data','')::timestamptz,p->>'consentimento_ip',ARRAY(SELECT jsonb_array_elements_text(coalesce(p->'tags','[]'))),coalesce(p->>'validacao','valido'))
 ON CONFLICT(email) DO UPDATE SET nome=CASE WHEN excluded.nome<>'' THEN excluded.nome ELSE email_contacts.nome END,tags=ARRAY(SELECT DISTINCT unnest(email_contacts.tags||excluded.tags)),data_cadastro_original=least(email_contacts.data_cadastro_original,excluded.data_cadastro_original),updated_at=now()
 RETURNING id INTO result; RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.email_contact_merge(jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.email_contact_merge(jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.email_marketing_lease(owner_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 INSERT INTO email_marketing_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
 UPDATE email_marketing_settings SET lease_until=now()+interval '3 minutes',lease_owner=owner_id WHERE id AND (lease_until IS NULL OR lease_until<now()); RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.email_marketing_lease(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.email_marketing_lease(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.email_enqueue_campaign(cid uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer; tag_filter text; BEGIN
 SELECT audience_tag INTO tag_filter FROM email_campaigns WHERE id=cid AND status IN ('rascunho','pausada'); IF NOT FOUND THEN RAISE EXCEPTION 'Campanha não pode ser iniciada'; END IF;
 INSERT INTO email_sends(campaign_id,contact_id) SELECT cid,id FROM email_contacts WHERE status='ativo' AND consentimento_data IS NOT NULL AND nullif(consentimento_texto,'') IS NOT NULL AND (validacao='valido' OR (validacao='arriscado' AND risco_liberado)) AND NOT ('teste' = ANY(tags)) AND (tag_filter IS NULL OR tag_filter=ANY(tags)) ORDER BY data_cadastro_original DESC ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT; UPDATE email_campaigns SET status='enviando',pause_reason=NULL,started_at=coalesce(started_at,now()),updated_at=now() WHERE id=cid; RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.email_enqueue_campaign(uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.email_enqueue_campaign(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.email_marketing_event(eid text,etype text,pid text,etime timestamptz) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s email_sends%ROWTYPE; total numeric; rejected numeric; complaints numeric;
BEGIN
 INSERT INTO email_marketing_events(id,type,provider_id,occurred_at) VALUES(eid,etype,pid,etime) ON CONFLICT DO NOTHING; IF NOT FOUND THEN RETURN false; END IF;
 SELECT * INTO s FROM email_sends WHERE provider_id=pid FOR UPDATE; IF NOT FOUND THEN RETURN true; END IF;
 IF etype='email.delivered' THEN UPDATE email_sends SET delivered_at=coalesce(delivered_at,etime) WHERE id=s.id;
 ELSIF etype='email.opened' THEN UPDATE email_sends SET opened_at=coalesce(opened_at,etime) WHERE id=s.id; UPDATE email_contacts SET ultima_abertura=greatest(ultima_abertura,etime),envios_sem_abrir=(SELECT count(*) FROM email_sends WHERE contact_id=s.contact_id AND sent_at>etime AND opened_at IS NULL) WHERE id=s.contact_id;
 ELSIF etype='email.clicked' THEN UPDATE email_sends SET clicked_at=coalesce(clicked_at,etime) WHERE id=s.id; UPDATE email_contacts SET ultimo_clique=greatest(ultimo_clique,etime) WHERE id=s.contact_id;
 ELSIF etype='email.bounced' THEN UPDATE email_sends SET bounced_at=coalesce(bounced_at,etime) WHERE id=s.id; UPDATE email_contacts SET status='rejeitado',updated_at=now() WHERE id=s.contact_id AND status<>'reclamou';
 ELSIF etype='email.complained' THEN UPDATE email_sends SET complained_at=coalesce(complained_at,etime) WHERE id=s.id; UPDATE email_contacts SET status='reclamou',updated_at=now() WHERE id=s.contact_id;
 END IF;
 SELECT count(*) FILTER(WHERE sent_at IS NOT NULL),count(*) FILTER(WHERE bounced_at IS NOT NULL),count(*) FILTER(WHERE complained_at IS NOT NULL) INTO total,rejected,complaints FROM email_sends WHERE campaign_id=s.campaign_id;
 IF total>0 AND (rejected/total>0.03 OR complaints/total>0.001) THEN UPDATE email_campaigns SET status='pausada',pause_reason='Limite de rejeições ou reclamações excedido',updated_at=now() WHERE id=s.campaign_id; UPDATE email_marketing_settings SET admin_alert='Campanha pausada: rejeição acima de 3% ou reclamação acima de 0,1%.' WHERE id; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.email_marketing_event(text,text,text,timestamptz) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.email_marketing_event(text,text,text,timestamptz) TO service_role;
CREATE OR REPLACE FUNCTION public.email_marketing_contact_source() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p jsonb; em text; BEGIN
 p=to_jsonb(NEW);
 IF TG_TABLE_NAME='opportunity_subscribers' THEN IF p->>'consent_email'<>'true' OR nullif(p->>'unsubscribed_at','') IS NOT NULL THEN RETURN NEW; END IF; em=p->>'email';
 ELSIF TG_TABLE_NAME='leads' THEN IF coalesce(p->'payload'->>'consent_email',p->'payload'->>'marketing_consent','false')<>'true' THEN RETURN NEW; END IF; em=p->>'email';
 ELSE RETURN NEW; END IF;
 IF em IS NOT NULL AND em LIKE '%@%' THEN PERFORM email_contact_merge(jsonb_build_object('email',em,'nome',p->>'name','origem',coalesce(p->>'source','oportunidades'),'data_cadastro_original',p->>'created_at','consentimento_texto',coalesce(p->>'consent_text',p->'payload'->>'consent_text',p->'payload'->>'marketing_consent_text'),'consentimento_data',coalesce(p->>'consent_at',p->'payload'->>'consent_at',p->'payload'->>'marketing_consent_at'),'consentimento_ip',coalesce(p->>'consent_ip',p->'payload'->>'consent_ip'),'validacao','valido','tags',jsonb_build_array(coalesce(p->>'source','oportunidades')))); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER email_marketing_from_opportunities AFTER INSERT OR UPDATE ON public.opportunity_subscribers FOR EACH ROW EXECUTE FUNCTION public.email_marketing_contact_source();
CREATE TRIGGER email_marketing_from_leads AFTER INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.email_marketing_contact_source();