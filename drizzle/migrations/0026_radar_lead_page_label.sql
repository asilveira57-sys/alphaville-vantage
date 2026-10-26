CREATE OR REPLACE FUNCTION public.leads_from_radar()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_src text; v_label text; v_path text;
BEGIN
  v_path := split_part(coalesce(NEW.landing_page,''), '?', 1);
  IF NEW.conversion_context LIKE 'partner\_%' THEN
    v_src := 'parceiro'; v_label := 'Parceiro: ' || substr(NEW.conversion_context, 9);
  ELSIF NEW.conversion_context LIKE 'empreendimento\_%' THEN
    v_src := 'empreendimento'; v_label := 'Empreendimento: ' || substr(NEW.conversion_context, 16);
  ELSIF v_path LIKE '/radar%' THEN
    v_src := 'radar'; v_label := 'Radar: ' || v_path;
  ELSE
    v_src := 'radar'; v_label := 'Radar';
  END IF;
  PERFORM public.upsert_lead(v_src, v_label,'real_estate_radar_leads',NEW.id,NEW.lead_name,NEW.lead_phone,NEW.lead_email,NEW.landing_page,
    COALESCE(NEW.profile_summary, NEW.interest_type), to_jsonb(NEW), NEW.created_at);
  RETURN NEW;
END $function$;