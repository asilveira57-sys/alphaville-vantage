import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { campaignSchema, contactSchema, RECONFIRMATION, campaignTestSchema } from './campaign-rules';
import type { Json } from '@/integrations/supabase/types';

export const listCampaigns = createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {assertCampaignAdmin}=await import('./campaigns.server'); await assertCampaignAdmin(context);
  const [campaigns,contacts,settings,metrics,tests]=await Promise.all([
    context.supabase.from('email_campaigns').select('*').order('created_at',{ascending:false}),
    context.supabase.from('email_contacts').select('*').order('data_cadastro_original',{ascending:false}).limit(100),
    context.supabase.from('email_marketing_settings').select('*').eq('id',true).maybeSingle(),
    context.supabase.rpc('email_campaign_metrics'),
    context.supabase.from('email_campaign_tests').select('*').order('created_at',{ascending:false}).limit(30),
  ]);
  for(const r of [campaigns,contacts,settings,metrics,tests]) if(r.error) throw new Error(r.error.message);
  const {count}=await context.supabase.from('email_contacts').select('id',{head:true,count:'exact'});
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {data:stats}=await supabaseAdmin.rpc('email_contact_summary');
  return {campaigns:campaigns.data||[],contacts:contacts.data||[],total:count||0,settings:settings.data,metrics:metrics.data||[],stats:stats||[],tests:tests.data||[]};
});
export const saveCampaign=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>campaignSchema.parse(d)).handler(async({context,data})=>{
  const {assertCampaignAdmin,renderRecipient}=await import('./campaigns.server'); await assertCampaignAdmin(context);
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const id=data.id||crypto.randomUUID();
  if(data.id){const {data:existing}=await supabaseAdmin.from('email_campaigns').select('status').eq('id',id).single(); if(existing?.status!=='rascunho')throw new Error('Só é possível editar um rascunho.');}
  const secret=process.env['EMAIL_MARKETING_SIGNING_KEY']; if(!secret)throw new Error('Assinatura não configurada.');
  await renderRecipient(supabaseAdmin,{...data,id},'00000000-0000-4000-8000-000000000001',secret);
  const {error}=await supabaseAdmin.from('email_campaigns').upsert({...data,id,blocks:data.blocks as Json,updated_at:new Date().toISOString()}); if(error)throw new Error(error.message);
  return {id};
});
export const campaignPreview=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>campaignSchema.parse(d)).handler(async({context,data})=>{
  const {assertCampaignAdmin,emailProperties}=await import('./campaigns.server'); await assertCampaignAdmin(context);
  const {renderCampaign,CAMPAIGN_SITE}=await import('./campaign-render');
  const properties=await emailProperties(context.supabase,data.blocks.flatMap(b=>b.propertyIds));
  return renderCampaign(data.blocks,data.slug,properties,`${CAMPAIGN_SITE}/descadastrar`,`${CAMPAIGN_SITE}/confirmar-email`);
});
export const importCampaignContacts=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({rows:z.array(contactSchema).max(250)}).parse(d)).handler(async({context,data})=>{
  const {assertCampaignAdmin}=await import('./campaigns.server');await assertCampaignAdmin(context);
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server'); let imported=0,skipped=0;
  for(let i=0;i<data.rows.length;i+=5){await Promise.all(data.rows.slice(i,i+5).map(async row=>{
    if(row.validacao==='invalido'){skipped++;return;}
    const {error}=await supabaseAdmin.rpc('email_contact_merge',{p:JSON.parse(JSON.stringify(row))});if(error)throw new Error(error.message);imported++;
  }));}return {imported,skipped};
});
export const unifyCampaignContacts=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {assertCampaignAdmin}=await import('./campaigns.server');await assertCampaignAdmin(context);
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {data,error}=await supabaseAdmin.rpc('email_marketing_unify'); if(error)throw new Error(error.message);return {merged:data||0};
});
export const updateCampaignContact=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({id:z.string().uuid(),action:z.enum(['release_risk','deactivate','activate'])}).parse(d)).handler(async({context,data})=>{
  const {assertCampaignAdmin}=await import('./campaigns.server');await assertCampaignAdmin(context);
  const {data:c,error}=await context.supabase.from('email_contacts').select('*').eq('id',data.id).single();if(error||!c)throw new Error('Contato não encontrado.');
  if(['reclamou','descadastrado','rejeitado','invalido'].includes(c.status))throw new Error('Contato suprimido: não pode ser reativado pelo painel.');
  if(data.action!=='deactivate' && (!c.consentimento_data||!c.consentimento_texto))throw new Error('Consentimento de marketing obrigatório.');
  const patch=data.action==='release_risk'?{risco_liberado:true,status:'ativo'}: {status:data.action==='activate'?'ativo':'inativo'};
  const {error:e}=await context.supabase.from('email_contacts').update({...patch,updated_at:new Date().toISOString()}).eq('id',c.id);if(e)throw new Error(e.message);return {ok:true};
});
export const campaignAction=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({id:z.string().uuid(),action:z.enum(['start','pause'])}).parse(d)).handler(async({context,data})=>{
  const {assertCampaignAdmin}=await import('./campaigns.server');await assertCampaignAdmin(context);
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  if(data.action==='pause'){const {error}=await supabaseAdmin.from('email_campaigns').update({status:'pausada',pause_reason:'Pausada pelo administrador'}).eq('id',data.id);if(error)throw new Error(error.message);return {queued:0};}
  const {data:s}=await supabaseAdmin.from('email_marketing_settings').select('sending_enabled').eq('id',true).maybeSingle();if(!s?.sending_enabled)throw new Error('Envios reais desligados. Ative nas configurações somente após revisar a lista.');
  if(!process.env['RESEND_WEBHOOK_SECRET'])throw new Error('Configure os eventos do Resend antes de iniciar campanhas reais.');
  const {data:unfinished}=await supabaseAdmin.from('email_batches').select('id').eq('campaign_id',data.id).eq('status','sending').limit(1).maybeSingle();if(unfinished)throw new Error('Há um envio de resultado incerto. Confira no Resend antes de retomar.');
  const {data:n,error}=await supabaseAdmin.rpc('email_enqueue_campaign',{cid:data.id});if(error)throw new Error(error.message);
  const {error:armError}=await supabaseAdmin.rpc('email_marketing_arm_queue');if(armError){await supabaseAdmin.from('email_campaigns').update({status:'pausada',pause_reason:`Fila não iniciada: ${armError.message}`}).eq('id',data.id);throw new Error(armError.message);}
  return {queued:n||0};
});
export const saveCampaignSettings=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({daily_limit:z.number().int().min(1).max(100000),batch_size:z.number().int().min(1).max(100),requests_per_second:z.number().int().min(1).max(10),sending_enabled:z.boolean()}).parse(d)).handler(async({context,data})=>{
  const {assertCampaignAdmin}=await import('./campaigns.server');await assertCampaignAdmin(context);
  const {error}=await context.supabase.from('email_marketing_settings').upsert({...data,id:true,updated_at:new Date().toISOString()});if(error)throw new Error(error.message);return {ok:true};
});
export const campaignProperties=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({q:z.string().max(160)}).parse(d)).handler(async({context,data})=>{
  const {assertCampaignAdmin}=await import('./campaigns.server');await assertCampaignAdmin(context);
  const q=data.q.replace(/[%_,().]/g,' ').trim();
  let query=context.supabase.from('properties').select('id,title,internal_code,card_image_url,price_sale,price_rent,purpose').eq('status','active').limit(20);
  if(q)query=query.or(`internal_code.ilike.%${q}%,title.ilike.%${q}%`);
  const {data:rows,error}=await query;if(error)throw new Error(error.message);return rows||[];
});
export const registerInternalConsent=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({id:z.string().uuid(),reason:z.string().trim().min(10).max(2000)}).parse(d)).handler(async({context,data})=>{
  const {assertCampaignAdmin}=await import('./campaigns.server');await assertCampaignAdmin(context);
  const {error}=await context.supabase.rpc('email_register_internal_consent',{cid:data.id,reason:data.reason});if(error)throw new Error(error.message);return {ok:true};
});
export const campaignTestStatus=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({id:z.string().uuid()}).parse(d)).handler(async({context,data})=>{
  const {assertCampaignAdmin,resendStatus}=await import('./campaigns.server');await assertCampaignAdmin(context);
  const {data:t,error}=await context.supabase.from('email_campaign_tests').select('*').eq('id',data.id).single();if(error||!t?.provider_id)throw new Error('Teste sem ID do Resend.');
  const key=process.env['RESEND_API_KEY'];if(!key)throw new Error('Resend não configurado.');
  const status=await resendStatus(key,t.provider_id);const {error:e}=await context.supabase.from('email_campaign_tests').update({status,updated_at:new Date().toISOString()}).eq('id',t.id);if(e)throw new Error(e.message);return {status,providerId:t.provider_id};
});
export const sendCampaignTest=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>campaignTestSchema.parse(d)).handler(async({context,data})=>{
  const {assertCampaignAdmin,renderRecipient,resendCall,sender,replyTo}=await import('./campaigns.server');await assertCampaignAdmin(context);
  const key=process.env['RESEND_API_KEY'],secret=process.env['EMAIL_MARKETING_SIGNING_KEY'];if(!key||!secret)throw new Error('Resend não configurado.');
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {data:campaign,error}=await supabaseAdmin.from('email_campaigns').select('*').eq('id',data.id).single();if(error||!campaign)throw new Error('Campanha não encontrada.');
  // Isolated tests do not create/update contacts or email_sends. Links use a nonexistent contact.
  const rendered=await renderRecipient(supabaseAdmin,campaign,crypto.randomUUID(),secret);
  const results=[];
  for(const recipient of data.to){
    const {data:t,error:insertError}=await supabaseAdmin.from('email_campaign_tests').insert({campaign_id:data.id,requested_by:context.userId,recipient}).select('id').single();if(insertError||!t)throw new Error(insertError?.message||'Não foi possível registrar o teste.');
    try{
      const r=await resendCall(key,'/emails',{from:sender,to:[recipient],reply_to:replyTo,subject:`[TESTE] ${campaign.assunto}`,html:rendered.html,text:rendered.text},`campaign-test/${t.id}`);
      if(!r.id)throw new Error('Resend não retornou ID: não repetir automaticamente.');
      const {error:e}=await supabaseAdmin.from('email_campaign_tests').update({provider_id:r.id,status:'accepted',updated_at:new Date().toISOString()}).eq('id',t.id);if(e)throw new Error(`ID ${r.id}: ${e.message}`);
      results.push({id:t.id,recipient,providerId:r.id,status:'accepted',error:null});
    }catch(e){const message=e instanceof Error?e.message:'Erro de envio';await supabaseAdmin.from('email_campaign_tests').update({status:'erro',error:message}).eq('id',t.id);results.push({id:t.id,recipient,providerId:null,status:'erro',error:message});}
  }
  return {results};
});
export const createReconfirmation=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {assertCampaignAdmin}=await import('./campaigns.server');await assertCampaignAdmin(context);
  const {data:existing}=await context.supabase.from('email_campaigns').select('id').eq('slug','reconfirmacao').maybeSingle();if(existing)return existing;
  const {data,error}=await context.supabase.from('email_campaigns').insert({nome:'Reconfirmação',slug:'reconfirmacao',assunto:'Vamos continuar em contato?',blocks:RECONFIRMATION}).select('id').single();if(error)throw new Error(error.message);return data;
});