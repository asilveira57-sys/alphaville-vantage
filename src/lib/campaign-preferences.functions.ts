import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
export const campaignPreference=createServerFn({method:'POST'}).inputValidator((d:unknown)=>z.object({token:z.string().min(1).max(2000),action:z.enum(['unsubscribe','confirm'])}).parse(d)).handler(async({data})=>{
  const secret=process.env['EMAIL_MARKETING_SIGNING_KEY'];if(!secret)throw new Error('Preferências indisponíveis.');
  const {verifyCampaignToken}=await import('./campaign-tokens.server');
  const verified=await verifyCampaignToken(data.token,data.action,secret);if(!verified)throw new Error('Link inválido ou expirado.');
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  if(data.action==='unsubscribe'){
    const {error}=await supabaseAdmin.rpc('email_marketing_optout',{contact:verified.contact,campaign:verified.campaign});if(error)throw new Error('Não foi possível registrar agora.');return {ok:true};
  }
  const headers=getRequest().headers;
  const ip=headers.get('cf-connecting-ip')||headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'';
  const {data:ok,error}=await supabaseAdmin.rpc('email_marketing_confirm',{contact:verified.contact,ip});if(error||!ok)throw new Error('Este contato não pode receber e-mails.');return {ok:true};
});