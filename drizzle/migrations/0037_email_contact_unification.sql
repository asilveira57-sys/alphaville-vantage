CREATE OR REPLACE FUNCTION public.email_contact_summary() RETURNS TABLE(status text,validacao text,total bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT status,validacao,count(*) FROM email_contacts GROUP BY status,validacao $$;
REVOKE ALL ON FUNCTION public.email_contact_summary() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.email_contact_summary() TO service_role;
CREATE OR REPLACE FUNCTION public.email_marketing_unify() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; n integer=0; BEGIN
 FOR r IN SELECT * FROM newsletter_subscribers WHERE is_active LOOP
 PERFORM email_contact_merge(jsonb_build_object('email',r.email,'origem','newsletter','data_cadastro_original',r.created_at,'validacao','valido','tags',jsonb_build_array('newsletter',r.source,'consentimento_pendente'))); n=n+1;
 END LOOP;
 FOR r IN SELECT * FROM opportunity_subscribers WHERE consent_email AND unsubscribed_at IS NULL AND email IS NOT NULL LOOP
 PERFORM email_contact_merge(jsonb_build_object('email',r.email,'nome',r.name,'origem','oportunidades','data_cadastro_original',r.created_at,'consentimento_texto',r.consent_text,'consentimento_data',r.consent_at,'consentimento_ip',r.consent_ip,'validacao','valido','tags',jsonb_build_array('oportunidades',r.source))); n=n+1;
 END LOOP;
 FOR r IN SELECT * FROM leads WHERE email IS NOT NULL AND coalesce(payload->>'consent_email',payload->>'marketing_consent','false')='true' LOOP
 PERFORM email_contact_merge(jsonb_build_object('email',r.email,'nome',r.name,'origem',r.source,'data_cadastro_original',r.created_at,'consentimento_texto',coalesce(r.payload->>'consent_text',r.payload->>'marketing_consent_text'),'consentimento_data',coalesce(r.payload->>'consent_at',r.payload->>'marketing_consent_at'),'consentimento_ip',r.payload->>'consent_ip','validacao','valido','tags',jsonb_build_array(r.source))); n=n+1;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.email_marketing_unify() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.email_marketing_unify() TO service_role;
CREATE OR REPLACE FUNCTION public.email_marketing_newsletter_source() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NEW.is_active THEN PERFORM email_contact_merge(jsonb_build_object('email',NEW.email,'origem','newsletter','data_cadastro_original',NEW.created_at,'validacao','valido','tags',jsonb_build_array('newsletter',NEW.source,'consentimento_pendente'))); END IF; RETURN NEW;
END $$;
CREATE TRIGGER email_marketing_from_newsletter AFTER INSERT ON public.newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION public.email_marketing_newsletter_source();