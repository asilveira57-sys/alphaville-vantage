import { createFileRoute } from '@tanstack/react-router';
export const Route=createFileRoute('/api/public/hooks/campaign-queue')({server:{handlers:{POST:async({request})=>{
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {checkCronAuth}=await import('@/lib/cron-auth.server');
  const auth=await checkCronAuth(request,supabaseAdmin);if(!auth.ok)return auth.response;
  const key=process.env['RESEND_API_KEY'],signing=process.env['EMAIL_MARKETING_SIGNING_KEY'];
  if(!key||!signing||!process.env['RESEND_WEBHOOK_SECRET'])return Response.json({sent:0,reason:'Configuração de envio pendente'});
  const {processCampaignQueue}=await import('@/lib/campaigns.server');
  try{return Response.json(await processCampaignQueue(supabaseAdmin,key,signing));}
  catch(e){console.error('[campaign-queue]',e instanceof Error?e.message:'error');return Response.json({error:'Envio pausado; veja o painel Campanhas.'},{status:500});}
}}}});