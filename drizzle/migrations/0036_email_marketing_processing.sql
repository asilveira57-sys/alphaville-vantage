CREATE OR REPLACE FUNCTION public.email_marketing_batch_commit(bid uuid, result jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item jsonb; s email_sends%ROWTYPE; c email_contacts%ROWTYPE; BEGIN
 IF EXISTS(SELECT 1 FROM email_batches WHERE id=bid AND status='sent') THEN RETURN; END IF;
 FOR item IN SELECT jsonb_array_elements(result) LOOP
 SELECT * INTO s FROM email_sends WHERE id=(item->>'send_id')::uuid AND batch_id=bid FOR UPDATE;
 IF NOT FOUND OR s.sent_at IS NOT NULL THEN CONTINUE; END IF;
 UPDATE email_sends SET status='enviado',provider_id=item->>'provider_id',sent_at=now(),error=NULL WHERE id=s.id;
 SELECT * INTO c FROM email_contacts WHERE id=s.contact_id FOR UPDATE;
 UPDATE email_contacts SET ultimo_envio=now(),envios_sem_abrir=envios_sem_abrir+1,status=CASE WHEN status='ativo' AND envios_sem_abrir+1>=8 THEN 'inativo' ELSE status END,updated_at=now() WHERE id=s.contact_id;
 END LOOP;
 UPDATE email_batches SET status='sent',provider_result=result,completed_at=now(),error=NULL WHERE id=bid;
END $$;
REVOKE ALL ON FUNCTION public.email_marketing_batch_commit(uuid,jsonb) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.email_marketing_batch_commit(uuid,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.email_marketing_optout(contact uuid,campaign uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 UPDATE email_contacts SET status=CASE WHEN status='reclamou' THEN status ELSE 'descadastrado' END,descadastrado_em=coalesce(descadastrado_em,now()),updated_at=now() WHERE id=contact;
 UPDATE email_sends SET unsubscribed_at=coalesce(unsubscribed_at,now()) WHERE contact_id=contact AND campaign_id=campaign;
 UPDATE email_sends SET status='suprimido' WHERE contact_id=contact AND status='pendente';
 UPDATE newsletter_subscribers SET is_active=false,updated_at=now() WHERE lower(email)=(SELECT email FROM email_contacts WHERE id=contact);
 UPDATE opportunity_subscribers SET consent_email=false,unsubscribed_at=coalesce(unsubscribed_at,now()),updated_at=now() WHERE lower(email)=(SELECT email FROM email_contacts WHERE id=contact);
END $$;
REVOKE ALL ON FUNCTION public.email_marketing_optout(uuid,uuid) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.email_marketing_optout(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.email_marketing_confirm(contact uuid,ip text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 UPDATE email_contacts SET consentimento_texto='Sim, quero continuar recebendo novidades e oportunidades por e-mail da S.A Imóveis Alphaville.',consentimento_data=now(),consentimento_ip=ip,envios_sem_abrir=0,status='ativo',updated_at=now() WHERE id=contact AND status NOT IN ('reclamou','rejeitado','invalido') AND (validacao='valido' OR risco_liberado); RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.email_marketing_confirm(uuid,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.email_marketing_confirm(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.email_campaign_metrics() RETURNS TABLE(campaign_id uuid,enviados bigint,entregues bigint,aberturas bigint,cliques bigint,rejeicoes bigint,reclamacoes bigint,descadastros bigint,pendentes bigint,leads bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT c.id,count(s.id) FILTER(WHERE s.sent_at IS NOT NULL),count(s.id) FILTER(WHERE s.delivered_at IS NOT NULL),count(s.id) FILTER(WHERE s.opened_at IS NOT NULL),count(s.id) FILTER(WHERE s.clicked_at IS NOT NULL),count(s.id) FILTER(WHERE s.bounced_at IS NOT NULL),count(s.id) FILTER(WHERE s.complained_at IS NOT NULL),count(s.id) FILTER(WHERE s.unsubscribed_at IS NOT NULL),count(s.id) FILTER(WHERE s.status='pendente'),(SELECT count(*) FROM public.leads l WHERE coalesce(l.payload->>'campaign',l.payload->>'utm_campaign')=c.slug OR l.landing_page LIKE '%utm_campaign='||c.slug||'&%' OR l.landing_page LIKE '%utm_campaign='||c.slug)
 FROM email_campaigns c LEFT JOIN email_sends s ON s.campaign_id=c.id WHERE public.has_role(auth.uid(),'admin') GROUP BY c.id;
$$;
REVOKE ALL ON FUNCTION public.email_campaign_metrics() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.email_campaign_metrics() TO authenticated,service_role;