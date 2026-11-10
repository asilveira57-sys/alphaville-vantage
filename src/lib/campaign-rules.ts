import { z } from 'zod';
import Papa from 'papaparse';

export const DAILY_WARMUP = 1000;
export const MAX_BATCH = 100;
export const INACTIVE_AFTER = 8;
export const blockSchema = z.object({
  type: z.enum(['cabecalho', 'texto', 'imagem', 'imoveis', 'botao', 'reconfirmacao']),
  text: z.string().max(6000).default(''), url: z.string().max(2000).default(''),
  alt: z.string().max(300).default(''), propertyIds: z.array(z.string().uuid()).max(8).default([]),
});
export type CampaignBlock = z.infer<typeof blockSchema>;
export const campaignSchema = z.object({
  id: z.string().uuid().optional(), nome: z.string().trim().min(2).max(160),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  assunto: z.string().trim().min(2).max(200), blocks: z.array(blockSchema).min(1).max(30),
  audience_tag: z.string().max(80).nullable().default(null),
});
export const contactSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254), nome: z.string().max(160).default(''),
  origem: z.string().max(80).default('csv'), data_cadastro_original: z.string().datetime({ offset: true }).optional(),
  consentimento_texto: z.string().max(2000).default(''), consentimento_data: z.string().datetime({ offset: true }).optional(),
  consentimento_ip: z.string().max(100).optional(), tags: z.array(z.string().max(80)).max(30).default([]),
  validacao: z.enum(['valido', 'arriscado', 'invalido']),
});
export type ImportContact = z.infer<typeof contactSchema>;
export function reservedEmailDomain(email: string) {
  const domain = email.trim().toLowerCase().split('@')[1] || '';
  return !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) || /(^|\.)(test|localhost|local|invalid|example|internal|lan)$/.test(domain) || /(^|\.)example\.(com|net|org)$/.test(domain) || /^([0-9]+\.)+[0-9]+$/.test(domain);
}
export const campaignTestSchema = z.object({id:z.string().uuid(), to:z.array(z.string().trim().toLowerCase().email().max(254).refine(e=>!reservedEmailDomain(e),'Domínio reservado: teste não enviado.')).min(1).max(3).refine(a=>new Set(a).size===a.length,'Endereços repetidos.')});
export function internalConsentAllowed(c: {email:string;status:string}) {
  return !reservedEmailDomain(c.email) && !['descadastrado','reclamou','rejeitado','invalido'].includes(c.status);
}
export function eligibleContact(c: {email:string;status: string; validacao: string; risco_liberado?: boolean; consentimento_texto?: string | null; consentimento_data?: string | null; tags?: string[]}) {
  return !reservedEmailDomain(c.email) && c.status === 'ativo' && Boolean(c.consentimento_texto?.trim() && c.consentimento_data) &&
    (c.validacao === 'valido' || (c.validacao === 'arriscado' && c.risco_liberado === true)) && !c.tags?.includes('teste');
}
export const pauseForRates = (sent: number, bounced: number, complaints: number) => sent > 0 && (bounced / sent > .03 || complaints / sent > .001);
export function campaignUrl(url: string, slug: string) {
  const u = new URL(url); if (u.protocol !== 'https:') throw new Error('Use links HTTPS.');
  u.searchParams.set('utm_source', 'email'); u.searchParams.set('utm_medium', 'newsletter'); u.searchParams.set('utm_campaign', slug);
  return u.href;
}
export function parseContactCsv(csv: string) {
  const parsed = Papa.parse<Record<string, string>>(csv.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim().toLowerCase() });
  const rows: ImportContact[] = [], seen = new Set<string>();
  const counts = { total: parsed.data.length, validos: 0, arriscados: 0, invalidos: 0, duplicados: 0, semConsentimento: 0 };
  for (const r of parsed.data) {
    const result = contactSchema.safeParse({ ...r, nome: r.nome || '', origem: r.origem || 'csv',
      validacao: (r.validacao || '').trim().toLowerCase(),
      data_cadastro_original: r.data_cadastro_original || undefined,
      consentimento_data: r.consentimento_data || undefined, consentimento_texto: r.consentimento_texto || '',
      tags: (r.tags || '').split(/[|,]/).map(s => s.trim()).filter(Boolean),
    });
    if (!result.success || result.data.validacao === 'invalido') { counts.invalidos++; continue; }
    if (seen.has(result.data.email)) { counts.duplicados++; continue; } seen.add(result.data.email);
    const row = result.data;
    if (row.validacao === 'arriscado') { counts.arriscados++; row.tags = [...new Set([...row.tags, 'arriscado'])]; }
    else counts.validos++;
    if (!row.consentimento_texto || !row.consentimento_data) counts.semConsentimento++;
    rows.push(row);
  }
  return { rows, counts, errors: parsed.errors.map(e => e.message).slice(0, 10) };
}
export const RECONFIRMATION: CampaignBlock[] = [
  { type: 'cabecalho', text: 'Vamos continuar em contato?', url: '', alt: '', propertyIds: [] },
  { type: 'texto', text: 'Você quer continuar recebendo novidades, imóveis selecionados e oportunidades da S.A Imóveis Alphaville? Confirme sua preferência abaixo.', url: '', alt: '', propertyIds: [] },
  { type: 'reconfirmacao', text: 'Sim, quero continuar recebendo', url: '', alt: '', propertyIds: [] },
];