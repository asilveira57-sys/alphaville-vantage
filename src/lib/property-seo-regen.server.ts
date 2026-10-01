// Regeração de textos públicos de SEO usando SEMPRE o condomínio oficial (condominium_id).
// Nunca usa properties.condominium_name (texto cru do scrap) para texto público.
// Grava somente: title, seo_title, seo_description, descricao_seo (+ metadados de geração/auditoria).
import { buildSeoBody, buildSeoTitle, buildSeoDescription, auditProperty, type SeoSource } from "./property-seo";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any;

export const SEO_REGEN_COLS =
  "id,title,condominium_id,description,descricao_original,property_type,purpose,city,state,neighborhood,condominium_name,bedrooms,suites,bathrooms,lavabos,parking,parking_covered,parking_uncovered,area_useful,area_built,area_total,price_sale,price_rent,condo_fee,iptu,furnished,is_launch,accepts_exchange,internal_code,seo_title,seo_description,descricao_seo";

const NOT_APPLICABLE_SLUG = "nao-se-aplica";

/** id do condomínio → nome oficial (null para "Não se Aplica"). */
export async function loadOfficialCondoNames(sb: SB, ids: (string | null | undefined)[]): Promise<Map<string, string | null>> {
  const uniq = Array.from(new Set(ids.filter(Boolean) as string[]));
  const map = new Map<string, string | null>();
  for (let i = 0; i < uniq.length; i += 200) {
    const { data, error } = await sb.from("condominiums").select("id,name,slug").in("id", uniq.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const c of data ?? []) {
      const na = c.slug === NOT_APPLICABLE_SLUG || /^n[aã]o\s+se\s+aplica$/i.test(String(c.name ?? "").trim());
      map.set(c.id, na ? null : String(c.name ?? "").trim() || null);
    }
  }
  return map;
}

export function toSeoSource(row: Record<string, unknown>, official: Map<string, string | null>): SeoSource {
  const cid = row["condominium_id"] as string | null;
  const condo = cid ? official.get(cid) ?? null : null;
  return {
    ...(row as unknown as SeoSource),
    condominium_name: condo,
    description: (row["descricao_original"] as string | null) ?? (row["description"] as string | null),
  };
}

export function buildPublicSeo(src: SeoSource, opening: string | null) {
  const descricao_seo = buildSeoBody(src, opening);
  const seo_title = buildSeoTitle(src);
  const seo_description = buildSeoDescription(src);
  const title = seo_title.replace(/\s*\|\s*S\.A Im[óo]veis.*$/i, "").trim();
  const audit = auditProperty({ ...src, descricao_seo });
  return { title, seo_title, seo_description, descricao_seo, audit };
}

/** Regera os textos SEO (sem IA) dos imóveis informados. */
export async function regenerateSeoForIds(sb: SB, ids: string[]): Promise<number> {
  let updated = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await sb.from("properties").select(SEO_REGEN_COLS).in("id", ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Record<string, unknown>[];
    const official = await loadOfficialCondoNames(sb, rows.map((r) => r["condominium_id"] as string | null));
    for (const row of rows) {
      const out = buildPublicSeo(toSeoSource(row, official), null);
      const { error: e } = await sb.from("properties").update({
        title: out.title, seo_title: out.seo_title, seo_description: out.seo_description, descricao_seo: out.descricao_seo,
        seo_generated_at: new Date().toISOString(), seo_used_ai: false,
        audit_status: out.audit.status, audit_issues: out.audit.issues,
      }).eq("id", row["id"]);
      if (!e) updated++;
    }
  }
  return updated;
}
