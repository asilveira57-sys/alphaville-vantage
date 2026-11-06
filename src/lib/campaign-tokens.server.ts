import { z } from 'zod';
const schema = z.object({ contact: z.string().uuid(), campaign: z.string().uuid(), action: z.enum(['unsubscribe','confirm']), exp: z.number().int() });
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function key(secret: string) { return crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']); }
export async function signCampaignToken(contact: string,campaign: string,action: 'unsubscribe'|'confirm',secret: string) {
  const payload = b64(new TextEncoder().encode(JSON.stringify({contact,campaign,action,exp:Math.floor(Date.now()/1000)+60*60*24*365*5})));
  return `${payload}.${b64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(secret),new TextEncoder().encode(payload))))}`;
}
export async function verifyCampaignToken(token: string, action: 'unsubscribe'|'confirm', secret: string) {
  try {
    if (token.length>2000) return null;
    const [payload,signature,...rest]=token.split('.'); if (!payload||!signature||rest.length) return null;
    if (!await crypto.subtle.verify('HMAC',await key(secret),unb64(signature),new TextEncoder().encode(payload))) return null;
    const data=schema.parse(JSON.parse(new TextDecoder().decode(unb64(payload))));
    return data.action===action && data.exp>Math.floor(Date.now()/1000) ? data : null;
  } catch { return null; }
}