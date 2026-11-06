import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { SiteLayout } from '@/components/site-layout';
import { campaignPreference } from '@/lib/campaign-preferences.functions';
export function CampaignPreferences({token,action}:{token:string;action:'unsubscribe'|'confirm'}){
  const submit=useServerFn(campaignPreference);const [done,setDone]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  return <SiteLayout><section className="mx-auto max-w-xl px-6 py-20"><p className="text-sm text-muted-foreground">S.A Imóveis Alphaville</p><h1 className="font-serif text-3xl mt-3 mb-6">{done?(action==='unsubscribe'?'Descadastro registrado':'Preferência confirmada'):(action==='unsubscribe'?'Descadastrar e-mail':'Continuar recebendo novidades')}</h1>
    {done?<p>{action==='unsubscribe'?'Você não receberá mais nossas campanhas de e-mail.':'Obrigado. Você continuará recebendo novidades e oportunidades da S.A Imóveis Alphaville.'}</p>:<Button disabled={busy||!token} onClick={async()=>{setBusy(true);setError('');try{await submit({data:{token,action}});setDone(true);}catch(e){setError(e instanceof Error?e.message:'Não foi possível registrar.');}finally{setBusy(false);}}}>{busy?'Registrando…':action==='unsubscribe'?'Não quero mais receber':'Sim, quero continuar recebendo'}</Button>}
    {error&&<p role="alert" className="text-destructive mt-4">{error}</p>}{!token&&!done&&<p className="mt-4">Abra o link recebido no seu e-mail.</p>}</section></SiteLayout>;
}