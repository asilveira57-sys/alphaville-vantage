import { createFileRoute } from '@tanstack/react-router';
export const Route=createFileRoute('/api/public/hooks/campaign-queue')({server:{handlers:{POST:async({request})=>{
  const secret=process.env['CRON_SECRET'];
  const auth=request.headers.get('authorization')||'';
  // Constant-time comparison, server-only cron credential (never the publishable key).
  const a=new TextEncoder().encode(auth),b=new TextEncoder().encode(`Bearer ${secret||''}`);let diff=a.length^b.length;
  for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a[i]||0)^(b[i]||0);
  if(!secret||diff!==0)return new Response('Unauthorized',{status:401});
  const key=process.env['RESEND_API_KEY'],signing=process.env['EMAIL_MARKETING_SIGNING_KEY'];
  if(!key||!signing||!process.env['RESEND_WEBHOOK_SECRET'])return Response.json({sent:0,reason:'Configuração de envio pendente'});
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {processCampaignQueue}=await import('@/lib/campaigns.server');
  try{return Response.json(await processCampaignQueue(supabaseAdmin,key,signing));}
  catch(e){console.error('[campaign-queue]',e instanceof Error?e.message:'error');return Response.json({error:'Envio pausado; veja o painel Campanhas.'},{status:500});}
}}}});