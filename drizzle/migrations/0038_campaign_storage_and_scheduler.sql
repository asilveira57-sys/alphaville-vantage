-- lovable-cron-fallback-reviewed: Requested minute-by-minute queue processing, armed only while a campaign has pending sends and unscheduled after drain; at most 1440 checks per active day.
CREATE POLICY campaign_image_admin ON storage.objects FOR ALL TO authenticated USING(bucket_id='campaign-images' AND public.has_role(auth.uid(),'admin')) WITH CHECK(bucket_id='campaign-images' AND public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.email_marketing_arm_queue() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='email-campaign-queue') THEN
 PERFORM cron.schedule('email-campaign-queue','* * * * *',$cmd$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM public.email_sends s JOIN public.email_campaigns c ON c.id=s.campaign_id WHERE s.status='pendente' AND c.status='enviando') AND EXISTS(SELECT 1 FROM public.email_marketing_settings WHERE id AND sending_enabled) THEN net.http_post(url:='https://project--423bfacb-1903-41d0-956b-db8a8497dedd.lovable.app/api/public/hooks/campaign-queue',headers:=jsonb_build_object('Content-Type','application/json','x-cron-secret',(SELECT secret FROM public.cron_secrets WHERE name='cron')),body:='{}'::jsonb) ELSE NULL END;
 SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='email-campaign-queue' AND NOT EXISTS(SELECT 1 FROM public.email_sends s JOIN public.email_campaigns c ON c.id=s.campaign_id WHERE s.status='pendente' AND c.status='enviando');
 $cmd$);
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.email_marketing_arm_queue() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.email_marketing_arm_queue() TO service_role;