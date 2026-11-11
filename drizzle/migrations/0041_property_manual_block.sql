CREATE OR REPLACE FUNCTION public.property_is_blocked(p_slug text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 WITH RECURSIVE paths(path, depth) AS (
 SELECT '/imoveis/' || p_slug, 0 UNION ALL
 SELECT r.new_url, paths.depth + 1 FROM paths JOIN public.seo_redirects r ON r.old_url = paths.path AND r.active WHERE paths.depth < 10
 ) SELECT EXISTS (SELECT 1 FROM public.properties p JOIN paths ON paths.path = '/imoveis/' || p.slug WHERE p.manual_overrides->>'blocked' = 'true' OR p.review_status = 'bloqueado_manual');
$$;
REVOKE ALL ON FUNCTION public.property_is_blocked(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.property_is_blocked(text) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.set_property_block(p_id uuid, p_blocked boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.properties; m jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.properties WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Imóvel não encontrado'; END IF;
 m := coalesce(p.manual_overrides, '{}'::jsonb);
 IF p_blocked THEN
 IF m->>'blocked' = 'true' THEN RETURN; END IF;
 m := m || jsonb_build_object('blocked',true,'blocked_at',now(),'blocked_by',auth.uid(),'before_block_status',p.status,'before_block_review',p.review_status);
 UPDATE public.properties SET status='inactive', review_status='bloqueado_manual', manual_overrides=m WHERE id=p_id;
 ELSE
 IF m->>'blocked' IS DISTINCT FROM 'true' AND p.review_status IS DISTINCT FROM 'bloqueado_manual' THEN RETURN; END IF;
 UPDATE public.properties SET status='paused', review_status=m->>'before_block_review', manual_overrides=(m - 'blocked' - 'blocked_at' - 'blocked_by' - 'before_block_status' - 'before_block_review') || jsonb_build_object('unblocked_at',now(),'unblocked_by',auth.uid()) WHERE id=p_id;
 END IF;
 INSERT INTO public.cms_audit_log(actor_id,action,entity_table,entity_id,details) VALUES(auth.uid(), CASE WHEN p_blocked THEN 'property.block' ELSE 'property.unblock' END,'properties',p_id,jsonb_build_object('code',p.internal_code,'previous_status',p.status));
END $$;
REVOKE ALL ON FUNCTION public.set_property_block(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_property_block(uuid,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.protect_blocked_property() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP='INSERT' THEN
 IF EXISTS(SELECT 1 FROM public.properties p WHERE (p.manual_overrides->>'blocked'='true' OR p.review_status='bloqueado_manual') AND (p.source_id=NEW.source_id OR upper(p.internal_code)=upper(NEW.internal_code) OR upper(NEW.internal_code)=ANY(p.previous_codes))) THEN RAISE EXCEPTION 'Imóvel bloqueado: reimportação proibida'; END IF;
 ELSE
 IF OLD.manual_overrides->>'blocked'='true' AND NOT public.has_role(auth.uid(),'admin') THEN
 NEW.manual_overrides := coalesce(NEW.manual_overrides,'{}'::jsonb) || jsonb_build_object('blocked',true,'blocked_at',OLD.manual_overrides->'blocked_at','blocked_by',OLD.manual_overrides->'blocked_by','before_block_status',OLD.manual_overrides->'before_block_status','before_block_review',OLD.manual_overrides->'before_block_review');
 NEW.source_id := OLD.source_id; NEW.internal_code := OLD.internal_code; NEW.previous_codes := OLD.previous_codes; NEW.slug := OLD.slug;
 END IF;
 END IF;
 IF NEW.manual_overrides->>'blocked'='true' THEN NEW.status:='inactive'; NEW.review_status:='bloqueado_manual'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_blocked_property BEFORE INSERT OR UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.protect_blocked_property();