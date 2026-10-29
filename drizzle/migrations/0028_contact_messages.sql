CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  landing_page text,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.contact_messages TO service_role;
GRANT SELECT ON public.contact_messages TO authenticated;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read contact messages" ON public.contact_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.leads_from_contact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.upsert_lead('contato','Contato','contact_messages',NEW.id,NEW.name,NEW.phone,NEW.email,COALESCE(NEW.landing_page,'/contato'),
    left(NEW.message, 300), to_jsonb(NEW) - 'ip_hash' - 'user_agent', NEW.created_at);
  RETURN NEW;
END $function$;

CREATE TRIGGER trg_leads_contact AFTER INSERT OR UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.leads_from_contact();