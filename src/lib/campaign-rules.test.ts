import { describe,it,expect } from 'vitest';
import { DAILY_WARMUP,MAX_BATCH,INACTIVE_AFTER,eligibleContact,pauseForRates,parseContactCsv,campaignUrl } from './campaign-rules';
import { signCampaignToken,verifyCampaignToken } from './campaign-tokens.server';
describe('marketing rules',()=>{
 it('starts at 1000 daily',()=>expect(DAILY_WARMUP).toBe(1000));
 it('caps batches at 100',()=>expect(MAX_BATCH).toBe(100));
 it('inactivates after 8 unopened sends',()=>expect(INACTIVE_AFTER).toBe(8));
 const c={status:'ativo',validacao:'valido',consentimento_texto:'Aceito novidades',consentimento_data:'2026-11-06T13:00:00Z'};
 it('only active consented recipients',()=>{expect(eligibleContact(c)).toBe(true);for(const status of ['inativo','descadastrado','rejeitado','reclamou','invalido'])expect(eligibleContact({...c,status})).toBe(false);expect(eligibleContact({...c,consentimento_data:null})).toBe(false);});
 it('risky requires explicit release',()=>{expect(eligibleContact({...c,validacao:'arriscado'})).toBe(false);expect(eligibleContact({...c,validacao:'arriscado',risco_liberado:true})).toBe(true);});
 it('invalid CSV entries stay out, risky tagged',()=>{const r=parseContactCsv('email,validacao\na@example.test,valido\nb@example.test,arriscado\nc@example.test,invalido\nA@example.test,valido');expect(r.rows).toHaveLength(2);expect(r.counts.invalidos).toBe(1);expect(r.counts.duplicados).toBe(1);expect(r.rows[1].tags).toContain('arriscado');});
 it('pauses above 3 percent rejection',()=>{expect(pauseForRates(100,3,0)).toBe(false);expect(pauseForRates(100,4,0)).toBe(true);});
 it('pauses above 0.1 percent complaints',()=>{expect(pauseForRates(1000,0,1)).toBe(false);expect(pauseForRates(1000,0,2)).toBe(true);});
 it('applies requested UTM',()=>{const u=new URL(campaignUrl('https://portal.saimoveisalpha.com.br/radar?x=1','reconfirmacao'));expect(u.searchParams.get('utm_campaign')).toBe('reconfirmacao');expect(u.searchParams.get('utm_source')).toBe('email');expect(u.searchParams.get('utm_medium')).toBe('newsletter');expect(u.searchParams.get('x')).toBe('1');});
 it('test contacts never qualify for real campaigns',()=>expect(eligibleContact({...c,tags:['teste']})).toBe(false));
 it('signed action tokens cannot be forged or cross-used',async()=>{const contact='00000000-0000-4000-8000-000000000001', campaign='00000000-0000-4000-8000-000000000002', secret='unit-test-only-key';const t=await signCampaignToken(contact,campaign,'unsubscribe',secret);expect((await verifyCampaignToken(t,'unsubscribe',secret))?.contact).toBe(contact);expect(await verifyCampaignToken(t,'confirm',secret)).toBeNull();expect(await verifyCampaignToken(t+'x','unsubscribe',secret)).toBeNull();});
});