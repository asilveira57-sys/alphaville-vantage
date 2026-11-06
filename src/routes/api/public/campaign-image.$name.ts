import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
export const Route=createFileRoute('/api/public/campaign-image/$name')({server:{handlers:{GET:async({params})=>{
 const parsed=z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/).safeParse(params.name);
 if(!parsed.success)return new Response('Not found',{status:404});
 // Deliberately public marketing images only; no bucket listing or arbitrary storage paths.
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {data,error}=await supabaseAdmin.storage.from('campaign-images').download(parsed.data);if(error||!data)return new Response('Not found',{status:404});
 return new Response(data,{headers:{'Content-Type':data.type||'image/jpeg','Cache-Control':'public,max-age=31536000,immutable','X-Content-Type-Options':'nosniff'}});
}}}});