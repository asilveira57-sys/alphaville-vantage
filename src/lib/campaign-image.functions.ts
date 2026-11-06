import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { CAMPAIGN_SITE } from './campaign-render';
export const uploadCampaignImage=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>z.object({base64:z.string().max(7000000),mime:z.enum(['image/jpeg','image/png','image/webp']),alt:z.string().trim().min(1).max(300)}).parse(d)).handler(async({context,data})=>{
 const {assertCampaignAdmin}=await import('./campaigns.server');await assertCampaignAdmin(context);
 const bytes=Uint8Array.from(atob(data.base64),c=>c.charCodeAt(0));
 if(bytes.length>5*1024*1024)throw new Error('Imagem deve ter até 5 MB.');
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;
 const webp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
 if(!(data.mime==='image/jpeg'&&jpeg||data.mime==='image/png'&&png||data.mime==='image/webp'&&webp))throw new Error('Arquivo de imagem inválido.');
 const ext=data.mime==='image/jpeg'?'jpg':data.mime==='image/png'?'png':'webp';const name=`${crypto.randomUUID()}.${ext}`;
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const {error}=await supabaseAdmin.storage.from('campaign-images').upload(name,bytes,{contentType:data.mime,upsert:false});if(error)throw new Error('Não foi possível salvar a imagem.');
 return {url:`${CAMPAIGN_SITE}/api/public/campaign-image/${name}`,alt:data.alt};
});