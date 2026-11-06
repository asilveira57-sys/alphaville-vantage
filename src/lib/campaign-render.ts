import type { CampaignBlock } from './campaign-rules';
import { campaignUrl } from './campaign-rules';
import logo from '@/assets/logo-sa-imoveis-amarela.png.asset.json';

// Email-only design tokens: inline CSS is required by email clients.
export const EMAIL_COLORS = { ink: '#0D0D0D', yellow: '#FFEF04', paper: '#FFFFFF', muted: '#666666', canvas: '#EAEAE6' };
export const CAMPAIGN_SITE = 'https://portal.saimoveisalpha.com.br';
const escape = (s: string) => s.replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch] || ch));
export type EmailProperty = {id: string; title: string; image: string | null; price: string; url: string};
export function renderCampaign(blocks: CampaignBlock[], slug: string, properties: EmailProperty[], unsubscribe: string, confirmation: string, reason = 'Você autorizou o recebimento de novidades da S.A Imóveis Alphaville.') {
  const c = EMAIL_COLORS;
  const texts: string[] = [];
  const button = (text: string, url: string) => `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${c.yellow}" style="padding:16px 22px"><a href="${escape(url)}" style="color:${c.ink};font:bold 15px Arial;text-decoration:none">${escape(text)}</a></td></tr></table>`;
  const content = blocks.map(b => {
    if (b.type === 'cabecalho') { texts.push(b.text); return `<h1 style="font:28px Georgia;color:${c.ink};margin:0 0 20px">${escape(b.text)}</h1>`; }
    if (b.type === 'texto') { texts.push(b.text); return `<p style="font:16px/1.6 Arial;color:${c.ink};margin:0 0 22px">${escape(b.text).replace(/\n/g,'<br>')}</p>`; }
    if (b.type === 'imagem') { const u = new URL(b.url); if (u.protocol !== 'https:') throw new Error('Imagem deve usar HTTPS.'); texts.push(b.alt); return `<img src="${escape(u.href)}" width="544" alt="${escape(b.alt)}" style="display:block;width:100%;height:auto;margin:0 0 22px">`; }
    if (b.type === 'botao' || b.type === 'reconfirmacao') { const u = b.type === 'reconfirmacao' ? confirmation : campaignUrl(b.url,slug); texts.push(`${b.text}: ${u}`); return button(b.text,u); }
    return b.propertyIds.map(id => {
      const p = properties.find(x => x.id === id); if (!p) return '';
      const u = campaignUrl(p.url,slug); texts.push(`${p.title}\n${p.price}\n${u}`);
      return `<table role="presentation" width="100%" style="margin:0 0 24px" cellpadding="0" cellspacing="0"><tr><td>${p.image ? `<a href="${escape(u)}"><img width="544" src="${escape(p.image)}" alt="${escape(p.title)}" style="display:block;width:100%;height:auto"></a>` : ''}<h2 style="font:22px Georgia;color:${c.ink}">${escape(p.title)}</h2><p style="font:bold 16px Arial">${escape(p.price)}</p>${button('Ver imóvel',u)}</td></tr></table>`;
    }).join('');
  }).join('');
  const footer = `S.A Imóveis Alphaville · CRECI 26075-J\nAv. Marcos Penteado de Ulhôa Rodrigues, 4053, Loja 4, Tamboré, Santana de Parnaíba - SP, 06543-001\n${reason}`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:${c.canvas}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${c.paper}"><tr><td bgcolor="${c.ink}" style="padding:24px 28px"><img src="${new URL(logo.url,CAMPAIGN_SITE).href}" width="180" alt="S.A Imóveis Alphaville" style="display:block;max-width:180px;height:auto"></td></tr><tr><td style="padding:28px">${content}</td></tr><tr><td style="padding:24px 28px;border-top:1px solid ${c.canvas};font:12px/1.6 Arial;color:${c.muted}">${escape(footer).replace(/\n/g,'<br>')}<br><a href="${escape(unsubscribe)}" style="color:${c.muted}">Descadastrar</a> · <a href="mailto:contato@saimoveisalpha.com.br" style="color:${c.muted}">Contato</a></td></tr></table></td></tr></table></body></html>`;
  if (new TextEncoder().encode(html).length >= 100 * 1024) throw new Error('E-mail deve ter menos de 100 KB.');
  return { html, text: texts.join('\n\n') + `\n\n${footer}\nDescadastrar: ${unsubscribe}` };
}