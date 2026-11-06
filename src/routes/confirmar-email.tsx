import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { CampaignPreferences } from '@/components/campaign-preferences';
export const Route=createFileRoute('/confirmar-email')({validateSearch:z.object({t:z.string().max(2000).optional()}),
 head:()=>({meta:[{title:'Confirmar novidades — S.A Imóveis Alphaville'},{name:'description',content:'Confirme seu consentimento para receber novidades e oportunidades por e-mail.'},{property:'og:title',content:'Confirmar novidades — S.A Imóveis Alphaville'},{property:'og:description',content:'Escolha continuar recebendo novidades da S.A Imóveis Alphaville.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'},{name:'robots',content:'noindex,nofollow'}]}),
 component:()=>{const {t}=Route.useSearch();return <CampaignPreferences token={t||''} action="confirm"/>;},
});