/** Pure API adapter and migration preview. Never writes or changes portal slugs. */
import { SITE_URL } from '../site';
export type TokkoProperty = {
  id: number; reference_code: string; public_url?: string; status?: number;
  type?: { name?: string }; location?: { full_location?: string; name?: string; type?: string };
  operations?: { operation_id?: number; operation_type?: string; prices?: { currency?: string; price?: number }[] }[];
  photos?: { image?: string; original?: string; order?: number; is_front_cover?: boolean }[];
  custom_tags?: { group_name?: string; name?: string }[];
  extra_attributes?: { name?: string; value?: string }[];
  development?: { name?: string } | null;
  [key: string]: unknown;
};
export type PortalMappingRow = {
  id: string; internal_code: string | null; source_id: string | null;
  source_url: string | null; external_ref: string | null; slug: string; status: string;
};
export const referenceKey = (value: string | null | undefined) => (value ?? '').trim().toUpperCase();
const numeric = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const positive = (value: unknown) => { const n = numeric(value); return n != null && n > 0 ? n : null; };
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null;
const TYPE_MAP: Record<string, string> = {
  Casa: 'casa', Apartamento: 'apartamento', Terreno: 'terreno', Escritório: 'sala',
  Galpão: 'galpão', 'Edifício comercial': 'prédio', 'Locais comerciais': 'loja',
  Chácara: 'chácara', Fazenda: 'fazenda',
};

const SMALL = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
/** Só até o nome da rua: tira número, sufixo "al" e complemento; capitaliza. */
export function cleanStreet(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.replace(/\s+/g, ' ').trim();
  s = s.replace(/[,\-]?\s*\d.*$/, '').trim();
  s = s.replace(/\s+al\.?$/i, '').replace(/[,\-\s]+$/, '').trim();
  if (!s) return null;
  return s.toLocaleLowerCase('pt-BR').split(' ')
    .map((w, i) => (i > 0 && SMALL.has(w)) ? w : w.charAt(0).toLocaleUpperCase('pt-BR') + w.slice(1)).join(' ');
}
/** "Alphaville Centro Industrial e Empresarial/Alphaville." → "Alphaville Centro Industrial e Empresarial". */
export const cleanHood = (v: string | null) => v ? v.split('/')[0].replace(/[.\s]+$/, '').trim() || null : null;
const fold = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const MONEY = new Set(['price_sale', 'price_rent', 'condo_fee', 'iptu']);
const FOLDED = new Set(['condominium_name', 'city', 'neighborhood', 'address']);
/** Campos que entram no texto SEO; mudança neles exige regerar. */
export const SEO_FACT_KEYS = ['property_type', 'purpose', 'price_sale', 'price_rent', 'condo_fee', 'iptu', 'iptu_period',
  'city', 'neighborhood', 'condominium_name', 'bedrooms', 'suites', 'bathrooms', 'lavabos', 'parking',
  'parking_covered', 'parking_uncovered', 'area_total', 'area_built', 'area_useful', 'address'];

export function tokkoFacts(p: TokkoProperty, officialUrl: string | null = null) {
  const operations = p.operations ?? [];
  const price = (id: number) => positive(operations.find(o => o.operation_id === id)?.prices?.find(v => v.currency === 'BRL')?.price);
  const sale = operations.some(o => o.operation_id === 1);
  const rent = operations.some(o => o.operation_id === 2);
  const location = (p.location?.full_location ?? '').split('|').map(v => v.trim());
  const photos = [...(p.photos ?? [])].sort((a, b) =>
    Number(Boolean(b.is_front_cover)) - Number(Boolean(a.is_front_cover)) || (a.order ?? 0) - (b.order ?? 0));
  const images = [...new Set(photos.map(v => v.original ?? v.image).filter((v): v is string => Boolean(v)))];
  const condo = p.custom_tags?.find(t => t.group_name === 'Empreendimento')?.name
    ?? p.extra_attributes?.find(t => t.name === 'condo_admin')?.value ?? p.development?.name;
  const period = p.iptu_type === 'Mensal' ? 'mensal' : p.iptu_type === 'Anual' ? 'anual' : null;
  const rawType = p.type?.name ?? '';
  return {
    internal_code: referenceKey(p.reference_code), source_id: String(p.id),
    ...(officialUrl ? { source_url: officialUrl, external_ref: new URL(officialUrl).pathname } : {}),
    property_type: TYPE_MAP[rawType] ?? null,
    purpose: sale && rent ? 'both' : rent ? 'rent' : sale ? 'sale' : null,
    price_sale: price(1), price_rent: price(2),
    condominium_name: text(condo), condo_fee: positive(p.expenses), iptu: positive(p.iptu), iptu_period: period,
    city: location[2] ?? null, state: location[1] === 'São Paulo' ? 'SP' : null,
    neighborhood: cleanHood(p.location?.type === 'Bairro' ? p.location.name ?? null : location[3] ?? null),
    address: cleanStreet(text(p.fake_address) ?? text(p.address)),
    // Tokko "suite_amount" = dormitórios (herança de "dormitorios"); suítes vêm de total_suites.
    // Contagens 0 nesta API significam "não informado": viram null e nunca sobrescrevem.
    bedrooms: positive(p.suite_amount), suites: positive(p.total_suites), bathrooms: positive(p.bathroom_amount),
    lavabos: positive(p.toilet_amount),
    parking: positive(p.parking_lot_amount)
      ?? (((positive(p.covered_parking_lot) ?? 0) + (positive(p.uncovered_parking_lot) ?? 0)) || null),
    parking_covered: positive(p.covered_parking_lot), parking_uncovered: positive(p.uncovered_parking_lot),
    area_total: positive(p.total_area) ?? positive(p.surface),
    area_built: positive(p.roofed_surface) ?? positive(p.total_surface),
    area_useful: positive(p.private_area) ?? positive(p.livable_area),
    description: text(p.description_only), descricao_original: text(p.description_only), images,
  };
}

/** Overrides use presence, not truthiness; a manual zero or null remains protected. */
export function apiFactPatch(db: Record<string, unknown>, facts: Record<string, unknown>) {
  const overrides = (db.manual_overrides ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  const conflicts: string[] = [];
  for (const [key, value] of Object.entries(facts)) {
    if (key === 'slug' || key === 'condominium_id' || value === undefined) continue;
    // API sem o dado (null/0) nunca apaga o valor atual.
    if (value == null) continue;
    if (Object.prototype.hasOwnProperty.call(overrides, key)) { conflicts.push(key); continue; }
    const cur = db[key];
    if (MONEY.has(key) && cur != null && Math.abs(Number(cur) - Number(value)) < 1) continue;
    if (FOLDED.has(key) && fold(cur) === fold(value)) continue;
    // Tipo só é preenchido quando vazio; trocas de tipo seguem para revisão manual.
    if (key === 'property_type' && cur) continue;
    // Nunca rebaixar locação/ambos para só venda.
    if (key === 'purpose' && value === 'sale' && (cur === 'rent' || cur === 'both')) continue;
    if (key === 'price_rent' && db.purpose !== 'sale' && facts.purpose === 'sale') continue;
    if (JSON.stringify(cur ?? null) !== JSON.stringify(value)) patch[key] = value;
  }
  // Nunca gravar suítes > dormitórios: nesse caso suítes ficam vazias.
  const bedrooms = Number('bedrooms' in patch ? patch.bedrooms : db.bedrooms);
  const suites = Number('suites' in patch ? patch.suites : db.suites);
  if (bedrooms > 0 && suites > bedrooms) {
    if (db.suites != null) patch.suites = null; else delete patch.suites;
  }
  const factChanged = SEO_FACT_KEYS.some(k => k in patch);
  return { patch, conflicts, factChanged, mainPhotoChanged: Array.isArray(patch.images)
    && patch.images[0] !== (Array.isArray(db.images) ? db.images[0] : undefined) };
}

export type MigrationRow = {
  result: 'matched' | 'new_in_api' | 'missing_in_api' | 'duplicate_code' | 'missing_code';
  code: string; portal_id: string; portal_status: string; portal_url: string;
  old_source_id: string; new_source_id: string; old_source_url: string;
  new_source_url: string; old_external_ref: string; new_external_ref: string;
  api_public_url: string; portal_count: number; api_count: number; note: string;
};
export function previewTokkoMigration(portal: PortalMappingRow[], api: TokkoProperty[], officialUrls: Record<string, string> = {}) {
  const groups = <T,>(items: T[], key: (item: T) => string) => {
    const out = new Map<string, T[]>();
    for (const item of items) { const k = key(item); out.set(k, [...(out.get(k) ?? []), item]); }
    return out;
  };
  const pg = groups(portal.filter(p => p.status !== 'inactive' && p.status !== 'sold'), p => referenceKey(p.internal_code));
  const ag = groups(api, p => referenceKey(p.reference_code));
  const rows: MigrationRow[] = [];
  for (const code of new Set([...pg.keys(), ...ag.keys()])) {
    const ps = pg.get(code) ?? []; const as = ag.get(code) ?? [];
    const result = !code ? 'missing_code' : ps.length > 1 || as.length > 1 ? 'duplicate_code'
      : !ps.length ? 'new_in_api' : !as.length ? 'missing_in_api' : 'matched';
    for (const p of ps.length ? ps : [null]) {
      const a = as.length === 1 ? as[0] : null;
      const url = a ? officialUrls[String(a.id)] ?? '' : '';
      rows.push({ result, code, portal_id: p?.id ?? '', portal_status: p?.status ?? '',
        portal_url: p ? `${SITE_URL}/imoveis/${p.slug}` : '',
        old_source_id: p?.source_id ?? '', new_source_id: a ? String(a.id) : '',
        old_source_url: p?.source_url ?? '', new_source_url: url,
        old_external_ref: p?.external_ref ?? '', new_external_ref: url ? new URL(url).pathname : '',
        api_public_url: a?.public_url ?? '', portal_count: ps.length, api_count: as.length,
        note: result === 'missing_in_api' ? 'Ausente da API; não pausar sem 2 dias e confirmação'
          : result === 'duplicate_code' ? 'Ambíguo; revisão manual, sem gravação'
          : !url && a ? 'API não fornece URL no domínio oficial; URL oficial pendente' : '',
      });
    }
  }
  return rows;
}