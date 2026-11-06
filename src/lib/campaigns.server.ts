import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { campaignSchema, eligibleContact, blockSchema } from './campaign-rules';
import { CAMPAIGN_SITE, renderCampaign } from './campaign-render';
import { signCampaignToken } from './campaign-tokens.server';
import { listingPrices } from './property-listing';
type DB = SupabaseClient<Database>;
export async function assertCampaignAdmin(context: {supabase: DB; userId: string}) {
  const {data,error}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
  if(error || !data) throw new Error('Acesso restrito ao administrador.');
}
export async function emailProperties(db: DB, ids: string[]) {
  if(!ids.length) return [];
  const {data,error}=await db.from('properties').select('id,title,slug,card_image_url,price_sale,price_rent,purpose').in('id',ids).eq('status','active');
  if(error) throw new Error(error.message);
  return (data||[]).map(p=>({id:p.id,title:p.title,image:p.card_image_url,price:listingPrices(p.price_sale,p.price_rent,'',p.purpose).primary,url:`${CAMPAIGN_SITE}/imoveis/${p.slug}`}));
}
export async function renderRecipient(db: DB,campaign: {id: string; slug: string; blocks: unknown},contactId: string,secret: string) {
  const blocks=blockSchema.array().parse(campaign.blocks);
  const properties=await emailProperties(db,blocks.flatMap(b=>b.propertyIds));
  const unsubscribe=`${CAMPAIGN_SITE}/descadastrar?t=${await signCampaignToken(contactId,campaign.id,'unsubscribe',secret)}`;
  const confirmation=`${CAMPAIGN_SITE}/confirmar-email?t=${await signCampaignToken(contactId,campaign.id,'confirm',secret)}`;
  return {...renderCampaign(blocks,campaign.slug,properties,unsubscribe,confirmation),unsubscribe};
}
export async function resendCall(key: string,path: string,body: unknown,idempotency: string) {
  const response=await fetch(`https://api.resend.com${path}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':idempotency},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
  if(!response.ok) {
    const errorBody=await response.text();
    console.error(`[campaign-resend] ${response.status}: ${errorBody}`);
    throw new Error(`Resend [${response.status}]: ${errorBody}`);
  }
  return response.json() as Promise<{id?: string; data?: {id:string}[]}>;
}
export const sender='S.A Imóveis Alphaville <novidades@news.saimoveisalpha.com.br>';
export const replyTo='contato@saimoveisalpha.com.br';
export async function processCampaignQueue(db: DB,key: string,secret: string) {
  const owner=crypto.randomUUID();
  const {data:leased,error:lockError}=await db.rpc('email_marketing_lease',{owner_id:owner});
  if(lockError) throw new Error(lockError.message);
  if(!leased) return {sent:0,reason:'Outra execução em andamento'};
  try {
    const {data:settings}=await db.from('email_marketing_settings').select('*').eq('id',true).single();
    if(!settings?.sending_enabled) return {sent:0,reason:'Envios reais desligados'};
    // In-flight batches are not automatically replayed: an ambiguous network outcome needs review.
    const {data:unfinished}=await db.from('email_batches').select('id,campaign_id,created_at').eq('status','sending').limit(1).maybeSingle();
    if(unfinished) {
      await db.from('email_campaigns').update({status:'pausada',pause_reason:'Envio com resultado incerto. Confira o Resend antes de retomar.'}).eq('id',unfinished.campaign_id);
      await db.from('email_marketing_settings').update({admin_alert:'Resultado incerto de envio. Nenhuma repetição automática; conferir no Resend.'}).eq('id',true);
      return {sent:0,reason:'Revisão de envio pendente'};
    }
    const day=new Date(); day.setUTCHours(0,0,0,0);
    const {count}=await db.from('email_sends').select('id',{head:true,count:'exact'}).gte('sent_at',day.toISOString());
    const remaining=settings.daily_limit-(count||0); if(remaining<=0) return {sent:0,reason:'Limite diário atingido'};
    if(settings.last_request_at && Date.now()-Date.parse(settings.last_request_at)<1000/settings.requests_per_second) return {sent:0,reason:'Intervalo de envio'};
    const {data:campaign}=await db.from('email_campaigns').select('*').eq('status','enviando').order('started_at').limit(1).maybeSingle();
    if(!campaign) return {sent:0,reason:'Sem campanha ativa'};
    const {data:pending,error}=await db.from('email_sends').select('id,contact_id,email_contacts(*)').eq('campaign_id',campaign.id).eq('status','pendente').order('created_at').limit(Math.min(remaining,settings.batch_size,100));
    if(error) throw new Error(error.message);
    if(!pending?.length) {await db.from('email_campaigns').update({status:'concluida',updated_at:new Date().toISOString()}).eq('id',campaign.id); return {sent:0,reason:'Campanha concluída'};}
    const valid=pending.filter(s=>s.email_contacts && eligibleContact(s.email_contacts));
    const suppressed=pending.filter(s=>!s.email_contacts || !eligibleContact(s.email_contacts));
    if(suppressed.length) await db.from('email_sends').update({status:'suprimido'}).in('id',suppressed.map(s=>s.id));
    if(!valid.length) return {sent:0,reason:'Contatos suprimidos'};
    const payload=[];
    for(const s of valid) {
      if(!s.email_contacts) continue;
      const rendered=await renderRecipient(db,campaign,s.contact_id,secret);
      payload.push({from:sender,to:[s.email_contacts.email],reply_to:replyTo,subject:campaign.assunto,html:rendered.html,text:rendered.text,
        headers:{'List-Unsubscribe':`<${rendered.unsubscribe}>, <mailto:${replyTo}?subject=Descadastrar>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'},
        tags:[{name:'send_id',value:s.id},{name:'campaign_id',value:campaign.id}]});
    }
    // Re-check campaign pause/suppression immediately before provider dispatch.
    const {data:freshCampaign}=await db.from('email_campaigns').select('status').eq('id',campaign.id).single();
    const {data:freshContacts}=await db.from('email_contacts').select('*').in('id',valid.map(s=>s.contact_id));
    if(freshCampaign?.status!=='enviando' || freshContacts?.some(c=>!eligibleContact(c))) return {sent:0,reason:'Preferências ou campanha alteradas'};
    const batchId=crypto.randomUUID();
    const {error:batchError}=await db.from('email_batches').insert({id:batchId,campaign_id:campaign.id,status:'sending',payload:JSON.parse(JSON.stringify(payload))}); if(batchError) throw new Error(batchError.message);
    const {error:markError}=await db.from('email_sends').update({status:'processando',batch_id:batchId}).in('id',valid.map(s=>s.id)); if(markError) throw new Error(markError.message);
    await db.from('email_marketing_settings').update({last_request_at:new Date().toISOString()}).eq('id',true);
    let response;
    try { response=await resendCall(key,'/emails/batch',payload,`campaign-batch/${batchId}`); }
    catch(e) {
      const message=e instanceof Error?e.message:'Erro Resend';
      await db.from('email_batches').update({error:message}).eq('id',batchId);
      await db.from('email_campaigns').update({status:'pausada',pause_reason:message}).eq('id',campaign.id);
      await db.from('email_marketing_settings').update({admin_alert:message}).eq('id',true);
      throw e;
    }
    if(response.data?.length!==valid.length) {
      await db.from('email_campaigns').update({status:'pausada',pause_reason:'Resposta Resend incompleta; conferir antes de repetir.'}).eq('id',campaign.id);
      throw new Error('Resposta incompleta do Resend.');
    }
    const result=response.data.map((r,i)=>({send_id:valid[i].id,provider_id:r.id}));
    const {error:commitError}=await db.rpc('email_marketing_batch_commit',{bid:batchId,result});
    if(commitError) throw new Error(commitError.message);
    return {sent:result.length,reason:'Lote enviado'};
  } finally { await db.from('email_marketing_settings').update({lease_until:null,lease_owner:null}).eq('id',true).eq('lease_owner',owner); }
}
export { campaignSchema };