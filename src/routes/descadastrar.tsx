import { createFileRoute } from '@tanstack/react-router';
import { CampaignPreferences } from '@/components/campaign-preferences';
import { z } from 'zod';
export const Route=createFileRoute('/descadastrar')({
  validateSearch:z.object({t:z.string().max(2000).optional()}),
  head:()=>({meta:[{title:'Descadastro de e-mail — S.A Imóveis Alphaville'},{name:'description',content:'Gerencie o recebimento de campanhas da S.A Imóveis Alphaville.'},{property:'og:title',content:'Descadastro — S.A Imóveis Alphaville'},{property:'og:description',content:'Preferências de e-mail da S.A Imóveis Alphaville.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex,nofollow'}]}),
  server:{handlers:{POST:async({request})=>{
    const token=new URL(request.url).searchParams.get('t')||'';const secret=process.env['EMAIL_MARKETING_SIGNING_KEY'];
    if(!secret)return new Response('Unavailable',{status:503});
    const {verifyCampaignToken}=await import('@/lib/campaign-tokens.server');const verified=await verifyCampaignToken(token,'unsubscribe',secret);
    if(!verified)return new Response('Invalid token',{status:400});
    const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
    const {error}=await supabaseAdmin.rpc('email_marketing_optout',{contact:verified.contact,campaign:verified.campaign});return new Response(error?'Please try again':'Unsubscribed',{status:error?500:200});
  }}},
  component:()=>{const {t}=Route.useSearch();return <CampaignPreferences token={t||''} action="unsubscribe"/>;},
});