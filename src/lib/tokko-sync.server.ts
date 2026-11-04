// Sincronização portal × API Tokko (nova plataforma do site principal).
// Casa por source_id (ID Tokko); sem casamento, por código de referência único dos dois lados.
// Usada pela verificação diária, pelo "Rodar agora" e pela migração inicial.
import { apiFactPatch, referenceKey, tokkoFacts, type TokkoProperty } from "./importers/tokko";
import { resolveOfficialCity, type OfficialCity } from "./cities";
import { buildSeoSlug, type SeoSource } from "./property-seo";
import { regenerateSeoForIds } from "./property-seo-regen.server";
import { fetchAllRows } from "./fetch-all";
import { SITE_URL } from "./site";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any;

export const PORTAL_COLS =
  "id,slug,status,created_at,internal_code,source_id,source_url,external_ref,manual_overrides,images," +
  "property_type,purpose,price_sale,price_rent,condominium_name,condo_fee,iptu,iptu_period,city,state,neighborhood," +
  "address,bedrooms,suites,bathrooms,lavabos,parking,parking_covered,parking_uncovered,area_total,area_built,area_useful," +
  "description,descricao_original,review_status,condominium_id";

export type PortalRow = Record<string, unknown> & {
  id: string; slug: string; status: string; created_at: string; internal_code: string | null;
  source_id: string | null; source_url: string | null;
};

const ORIGIN = "https://www.saimoveisalphaville.com.br";
const LINK = /https?:\/\/(?:www\.)?saimoveisalphaville\.com\.br\/(?:alugar|comprar|comprar-ou-alugar)\/[a-z]{2}\/[^/<"'\s]+\/[^/<"'\s]+\/[a-z]+\/(\d+)/g;

/** URL pública oficial de cada ID Tokko, lida do mapa do site do site principal. */
export async function officialUrlsFromSitemap(): Promise<Record<string, string>> {
  const r = await fetch(`${ORIGIN}/sitemap.xml`, { headers: { "User-Agent": "Mozilla/5.0 SA-Portal" } });
  if (!r.ok) return {};
  const out: Record<string, string> = {};
  for (const m of (await r.text()).matchAll(LINK)) {
    const url = m[0].replace(/^https?:\/\/(?:www\.)?/, "https://www.");
    if (!out[m[1]] || url < out[m[1]]) out[m[1]] = url;
  }
  return out;
}

const CLOSED = new Set(["inactive", "sold"]);
const propUrl = (slug: string) => `${SITE_URL}/imoveis/${slug}`;

export type SyncOptions = {
  apply: boolean;
  importLimit: number;
  officialUrls: Record<string, string>;
  cities: OfficialCity[];
  missesBeforePause: number;
  /** Confirma sumiço (ex.: página oficial fora do ar). */
  confirmGone: (row: PortalRow) => Promise<boolean>;
};

export async function syncFromTokko(sb: SB, api: TokkoProperty[], opts: SyncOptions) {
  const rows = await fetchAllRows<PortalRow>((f, t) => sb.from("properties").select(PORTAL_COLS).order("created_at").range(f, t));
  // Imóveis que a própria sincronização desativou voltam se reaparecerem na API.
  const openAll = rows.filter((r) => !CLOSED.has(r.status));
  const openCodes = new Set(openAll.map((r) => referenceKey(r.internal_code)).filter(Boolean));
  const returnable = rows.filter((r) => r.status === "inactive" && r.review_status === GONE
    && !openCodes.has(referenceKey(r.internal_code)));
  const open = [...openAll, ...returnable];
  // Qualquer registro do portal (até inativo) bloqueia importar de novo o mesmo código/ID.
  const knownCodes = new Set(rows.map((r) => referenceKey(r.internal_code)).filter(Boolean));
  const knownIds = new Set(rows.map((r) => r.source_id).filter(Boolean) as string[]);
  const apiById = new Map(api.map((a) => [String(a.id), a]));
  const count = <T,>(xs: T[], k: (x: T) => string) => xs.reduce((m, x) => m.set(k(x), (m.get(k(x)) ?? 0) + 1), new Map<string, number>());
  const apiCodes = count(api, (a) => referenceKey(a.reference_code));
  const portalCodes = count(open, (r) => referenceKey(r.internal_code));
  const apiByCode = new Map(api.map((a) => [referenceKey(a.reference_code), a]));

  const matched: { row: PortalRow; a: TokkoProperty }[] = [];
  const ambiguous: PortalRow[] = [];
  const missing: PortalRow[] = [];
  const usedApi = new Set<string>();
  for (const r of open) {
    const byId = r.source_id ? apiById.get(r.source_id) : undefined;
    if (byId) { matched.push({ row: r, a: byId }); usedApi.add(String(byId.id)); continue; }
    const code = referenceKey(r.internal_code);
    if (!code) { missing.push(r); continue; }
    if ((portalCodes.get(code) ?? 0) > 1 || (apiCodes.get(code) ?? 0) > 1) { ambiguous.push(r); continue; }
    const a = apiByCode.get(code);
    if (a && !usedApi.has(String(a.id))) { matched.push({ row: r, a }); usedApi.add(String(a.id)); }
    else missing.push(r);
  }
  // Códigos ambíguos do lado da API também não são importados.
  const ambiguousCodes = new Set([...ambiguous.map((r) => referenceKey(r.internal_code))]);
  const fresh = api.filter((a) => !usedApi.has(String(a.id)) && referenceKey(a.reference_code)
    && !ambiguousCodes.has(referenceKey(a.reference_code)) && (apiCodes.get(referenceKey(a.reference_code)) ?? 0) === 1
    && !knownCodes.has(referenceKey(a.reference_code)) && !knownIds.has(String(a.id)));

  const now = new Date().toISOString();
  const changedUrls = new Set<string>();
  const seoIds: string[] = [];
  const report: Record<string, unknown>[] = [];
  let updated = 0, photos = 0, reactivated = 0, paused = 0, imported = 0;
  const reactivatedSlugs: string[] = [];
  const deactivated: { code: string | null; slug: string; redirect: string }[] = [];
  const errors: string[] = [];

  for (const { row, a } of matched) {
    const url = opts.officialUrls[String(a.id)] ?? null;
    const facts = tokkoFacts(a, url) as Record<string, unknown>;
    if (facts.city) facts.city = resolveOfficialCity(String(facts.city), url, opts.cities) ?? null;
    delete facts.internal_code; delete facts.source_id; delete facts.source_url; delete facts.external_ref;
    const { patch, conflicts, factChanged, mainPhotoChanged } = apiFactPatch(row, facts);
    const link: Record<string, unknown> = { source_id: String(a.id), last_seen_at: now };
    if (url) { link.source_url = url; link.external_ref = new URL(url).pathname; }
    if (row.status === "paused" || row.status === "inactive") {
      link.status = "active"; reactivated++;
      if (row.review_status === GONE) { link.review_status = null; reactivatedSlugs.push(`/imoveis/${row.slug}`); }
    }
    const linkChanged = row.source_id !== link.source_id || (url && row.source_url !== url);
    if (Object.keys(patch).length || linkChanged || link.status) {
      if (opts.apply) {
        // Duplicados inativos (importados na troca de IDs) seguram o mesmo external_ref/ID:
        // liberar antes, senão o índice único bloqueia a atualização do registro ativo.
        if (linkChanged) {
          const ref = link.external_ref as string | undefined;
          await sb.from("properties").update({ external_ref: null, source_id: null })
            .in("status", ["inactive"]).neq("id", row.id)
            .or(`source_id.eq.${link.source_id}${ref ? `,external_ref.eq."${ref}"` : ""}`);
        }
        const { error } = await sb.from("properties").update({ ...patch, ...link }).eq("id", row.id);
        if (error) { errors.push(`${row.internal_code}: ${error.message}`); continue; }
      }
      if (Object.keys(patch).length) updated++;
      if (mainPhotoChanged) photos++;
      if (factChanged) seoIds.push(row.id);
      if (factChanged || link.status) changedUrls.add(propUrl(row.slug));
    }
    const changes = Object.keys(patch).filter((k) => k !== "images" && k !== "description" && k !== "descricao_original");
    if (changes.length || mainPhotoChanged || conflicts.length) report.push({
      code: row.internal_code, slug: row.slug, new_source_id: a.id,
      changes: changes.map((k) => `${k}: ${JSON.stringify(row[k] ?? null)} → ${JSON.stringify(patch[k])}`).join(" | "),
      main_photo_changed: mainPhotoChanged, manual_conflicts: conflicts.join(","),
    });
  }

  // Ausentes: ativo que não vem na API em 2 execuções seguidas é desativado
  // (sai da busca, do sitemap e dos condomínios; a página redireciona para a busca do condomínio).
  const missingActive = missing.filter((r) => r.status === "active");
  const missingReport: { code: string | null; slug: string; misses: number; paused: boolean }[] = [];
  for (const r of missingActive) {
    const key = r.source_id || `code:${referenceKey(r.internal_code)}` || r.id;
    const { data: miss } = await sb.from("source_missing").select("misses").eq("source_id", key).maybeSingle();
    const misses = (miss?.misses ?? 0) + 1;
    let didPause = false;
    if (opts.apply) {
      await sb.from("source_missing").upsert({ source_id: key, misses, last_missed_at: now, ...(miss ? {} : { first_missed_at: now }) });
      if (misses >= opts.missesBeforePause) {
        const target = await goneRedirectTarget(sb, r);
        const { error } = await sb.from("properties").update({ status: "inactive", review_status: GONE }).eq("id", r.id);
        if (error) errors.push(`desativar ${r.internal_code}: ${error.message}`);
        else {
          await upsertRedirect(sb, `/imoveis/${r.slug}`, target);
          paused++; didPause = true; changedUrls.add(propUrl(r.slug));
          deactivated.push({ code: r.internal_code, slug: r.slug, redirect: target });
        }
      }
    }
    missingReport.push({ code: r.internal_code, slug: r.slug, misses, paused: didPause });
  }
  if (opts.apply && reactivatedSlugs.length) {
    await sb.from("seo_redirects").update({ active: false }).in("old_url", reactivatedSlugs).eq("note", GONE);
  }
  if (opts.apply) {
    const found = matched.map((m) => String(m.a.id));
    for (let i = 0; i < found.length; i += 200) await sb.from("source_missing").delete().in("source_id", found.slice(i, i + 200));
  }

  // Novos: Barueri e Santana de Parnaíba primeiro.
  const prio = (a: TokkoProperty) => {
    const c = (a.location?.full_location ?? "").toLowerCase();
    return c.includes("barueri") ? 0 : c.includes("santana de parna") ? 1 : 2;
  };
  const newReport: { code: string; source_id: string; imported: boolean; slug?: string }[] = [];
  for (const a of [...fresh].sort((x, y) => prio(x) - prio(y))) {
    const url = opts.officialUrls[String(a.id)] ?? null;
    if (imported >= opts.importLimit || !opts.apply) { newReport.push({ code: referenceKey(a.reference_code), source_id: String(a.id), imported: false }); continue; }
    try {
      const f = tokkoFacts(a, url) as Record<string, unknown>;
      const rawCity = String(f.city ?? "");
      const officialCity = resolveOfficialCity(rawCity, url, opts.cities);
      // Cidade fora da tabela oficial: entra pausado (fora do sitemap) e vai para a revisão de cidades.
      const outOfArea = !officialCity;
      f.city = officialCity ?? f.city;
      const ref = url ? new URL(url).pathname : `/tokko/${a.id}`;
      let slug = buildSeoSlug({ ...f, external_ref: ref, source_url: url } as unknown as SeoSource, ref);
      const { data: clash } = await sb.from("properties").select("id").eq("slug", slug).maybeSingle();
      if (clash) slug = `${slug}-${Date.now().toString(36)}`;
      const clean = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined));
      const { data, error } = await sb.from("properties").insert({
        ...clean, slug, title: slug, source_id: String(a.id), source_url: url, external_ref: ref,
        status: outOfArea ? "paused" : "active",
        review_status: outOfArea ? "cidade_fora_area" : f.property_type ? null : "needs_review",
        extracted_at: now, last_seen_at: now, raw: { import_source: "tokko-api" },
      }).select("id,slug").single();
      if (error) throw new Error(error.message);
      if (outOfArea) {
        await sb.from("city_review_queue").insert({ property_id: data.id, raw_city: rawCity || null, source_url: url, reason: "Cidade fora da tabela oficial (importado pausado)" });
      }
      seoIds.push(data.id); imported++; if (!outOfArea) changedUrls.add(propUrl(data.slug));
      newReport.push({ code: referenceKey(a.reference_code), source_id: String(a.id), imported: true, slug: data.slug });
    } catch (e) { errors.push(`importar ${a.reference_code}: ${e instanceof Error ? e.message : String(e)}`); }
  }

  if (opts.apply) for (let i = 0; i < seoIds.length; i += 100) await regenerateSeoForIds(sb, seoIds.slice(i, i + 100));

  return {
    matched: matched.length, ambiguous: ambiguous.length, missing_active: missingActive.length,
    new_in_api: fresh.length, updated, photos_changed: photos, seo_regenerated: opts.apply ? seoIds.length : 0,
    reactivated, paused, deactivated, imported, errors, report, missingReport, newReport, changedUrls: [...changedUrls],
  };
}

export const GONE = "saiu_da_api";

/** Busca do mesmo condomínio (ou do bairro) para quem cai num anúncio que saiu. */
export async function goneRedirectTarget(sb: SB, r: PortalRow): Promise<string> {
  if (r.condominium_id) {
    const { data } = await sb.from("condominiums").select("slug").eq("id", r.condominium_id).maybeSingle();
    if (data?.slug && data.slug !== "nao-se-aplica") return `/imoveis?condo=${encodeURIComponent(data.slug)}`;
  }
  return "/imoveis";
}

export async function upsertRedirect(sb: SB, oldUrl: string, newUrl: string) {
  const { data: ex } = await sb.from("seo_redirects").select("id").eq("old_url", oldUrl).maybeSingle();
  if (ex) await sb.from("seo_redirects").update({ new_url: newUrl, active: true, redirect_type: 301, note: GONE }).eq("id", ex.id);
  else await sb.from("seo_redirects").insert({ old_url: oldUrl, new_url: newUrl, redirect_type: 301, active: true, note: GONE });
}
