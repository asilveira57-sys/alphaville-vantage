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
 INSERT INTO public.cms_audit_log(actor_id,action,entity_type,entity_id,details) VALUES(auth.uid(), CASE WHEN p_blocked THEN 'property.block' ELSE 'property.unblock' END,'property',p_id,jsonb_build_object('code',p.internal_code,'previous_status',p.status));
END $$;