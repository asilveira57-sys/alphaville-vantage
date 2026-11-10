import { createFileRoute } from '@tanstack/react-router';
import { Webhook } from 'svix';
import { z } from 'zod';
const eventSchema=z.object({type:z.enum(['email.delivered','email.bounced','email.complained','email.opened','email.clicked']),created_at:z.string().datetime({offset:true}),data:z.object({email_id:z.string().min(1).max(200)})});
export const Route=createFileRoute('/api/public/hooks/resend')({server:{handlers:{POST:async({request})=>{
  const secret=process.env['RESEND_WEBHOOK_SECRET'];if(!secret)return new Response('Events not configured',{status:503});
  if(Number(request.headers.get('content-length')||0)>100000)return new Response('Payload too large',{status:413});
  const raw=await request.text();if(raw.length>100000)return new Response('Payload too large',{status:413});
  const id=request.headers.get('svix-id'),timestamp=request.headers.get('svix-timestamp'),signature=request.headers.get('svix-signature');
  if(!id||!timestamp||!signature)return new Response('Unauthorized',{status:401});
  let verified:unknown;
  try{verified=new Webhook(secret).verify(raw,{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':signature});}catch{return new Response('Invalid signature',{status:401});}
  const parsed=eventSchema.safeParse(verified);if(!parsed.success)return Response.json({ignored:true});
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {data:test,error:testError}=await supabaseAdmin.from('email_campaign_tests').select('id').eq('provider_id',parsed.data.data.email_id).maybeSingle();
  if(testError)return new Response('Test lookup failed',{status:500});
  if(test){const {error}=await supabaseAdmin.from('email_campaign_tests').update({status:parsed.data.type.replace('email.',''),updated_at:new Date().toISOString()}).eq('id',test.id);return error?new Response('Test update failed',{status:500}):Response.json({ok:true,test:true});}
  const {error}=await supabaseAdmin.rpc('email_marketing_event',{eid:id,etype:parsed.data.type,pid:parsed.data.data.email_id,etime:parsed.data.created_at});
  if(error){console.error('[campaign-event]',id,error.code);return new Response('Event processing failed',{status:500});}
  return Response.json({ok:true});
}}}});