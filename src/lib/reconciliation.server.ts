// Conciliação portal × site principal, casando pelo número do final da URL (source_id).
// Usado pela verificação diária (pg_cron) e pelo botão "Rodar agora" do Admin.
import { extractSaFicha, sourceIdFromUrl } from "./importers/sa-ficha";
import { parseSaImoveis } from "./importers/sa-imoveis.parser";
import { resolveOfficialCity, type OfficialCity } from "./cities";
import { buildSeoSlug, type SeoSource } from "./property-seo";
import { regenerateSeoForIds } from "./property-seo-regen.server";
import { fetchAllRows } from "./fetch-all";
import { submitIndexNow } from "./indexnow.server";
import { SITE_URL, SITE_HOST } from "./site";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any;

export const ORIGIN = "https://www.saimoveisalphaville.com.br";
/** Base da trava: coleta abaixo de 80% disso interrompe a rotina. */
export const ORIGIN_BASELINE = 2290;
export const MIN_RATIO = 0.8;
export const MAX_IMPORTS_PER_DAY = 30;
export const MISSES_BEFORE_PAUSE = 2;

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "Cache-Control": "no-cache" };
const LINK = /(?:https?:\/\/www\.saimoveisalphaville\.com\.br)?\/(alugar|comprar|comprar-ou-alugar)\/([a-z]{2})\/([^/"'\s]+)\/([^/"'\s]+)\/([a-z]+)\/(\d+)/g;

export type OriginMap = Map<string, string[]>;

function addLinks(html: string, found: OriginMap): number {
  let n = 0;
  for (const m of html.matchAll(LINK)) {
    if (m[3].includes(".") || m[4].includes(".")) continue;
    const id = m[6];
    const url = `${ORIGIN}/${m.slice(1, 7).join("/")}`;
    const list = found.get(id);
    if (!list) { found.set(id, [url]); n++; }
    else if (!list.includes(url)) list.push(url);
  }
  return n;
}

/** Mapa do site + listagens paginadas até acabar (sempre os dois). */
export async function collectOriginIds(): Promise<{ ids: OriginMap; sitemapCount: number; pages: Record<string, number> }> {
  const found: OriginMap = new Map();
  const sm = await fetch(`${ORIGIN}/sitemap.xml`, { headers: UA, cache: "no-store" });
  if (!sm.ok) throw new Error(`Mapa do site da origem respondeu ${sm.status}`);
  addLinks(await sm.text(), found);
  const sitemapCount = found.size;
  const pages: Record<string, number> = {};
  for (const sec of ["comprar", "alugar", "comprar-ou-alugar"]) {
    let p = 1, idle = 0;
    for (; p < 400; p++) {
      const url = p === 1 ? `${ORIGIN}/${sec}` : `${ORIGIN}/${sec}/pagina-${p}/`;
      const r = await fetch(url, { headers: UA });
      const html = await r.text();
      const ids = [...html.matchAll(LINK)].length;
      const added = addLinks(html, found);
      if (!r.ok || !ids || (p > 1 && r.url.replace(/\/+$/, "") === `${ORIGIN}/${sec}`)) break;
      idle = added === 0 ? idle + 1 : 0;
      if (idle >= 2) break;
    }
    pages[sec] = p;
  }
  return { ids: found, sitemapCount, pages };
}

const pathOf = (u: string | null | undefined) => (u ? u.replace(/^https?:\/\/[^/]+/, "").replace(/\/+$/, "") : "");
const pickPath = (urls: string[]) => [...urls].sort()[0];

type Row = {
  id: string; source_id: string | null; external_ref: string | null; source_url: string | null;
  status: string; created_at: string; slug: string; condominium_id: string | null;
  manual_overrides: Record<string, unknown> | null; street_id: string | null;
};
const ROW_COLS = "id,source_id,external_ref,source_url,status,created_at,slug,condominium_id,manual_overrides,street_id";

export async function loadPortal(sb: SB): Promise<Row[]> {
  return fetchAllRows<Row>((from, to) => sb.from("properties").select(ROW_COLS).order("created_at").range(from, to));
}

const sidOf = (r: Row) => r.source_id || sourceIdFromUrl(r.source_url || r.external_ref);

/** Página do imóvel na origem: null quando saiu do ar (404, redireciona para busca ou "não encontrada"). */
export async function openOriginPage(url: string): Promise<string | null> {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) return null;
  const id = sourceIdFromUrl(url);
  if (id && !r.url.replace(/\/+$/, "").endsWith(id)) return null;
  const html = await r.text();
  if (/n[aã]o foi poss[ií]vel encontrar/i.test(html)) return null;
  if (!extractSaFicha(html, url).found) return null;
  return html;
}

const propUrl = (slug: string) => `${SITE_URL}/imoveis/${slug}`;

/** Item 1: junta registros do mesmo source_id (ex.: /comprar/ + /alugar/). */
export async function mergeDuplicates(sb: SB, rows: Row[], origin: OriginMap, log: (s: string) => void) {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    if (r.status === "inactive" || r.status === "sold") continue;
    const sid = sidOf(r);
    if (sid) groups.set(sid, [...(groups.get(sid) ?? []), r]);
  }
  const changedUrls: string[] = [];
  const examples: unknown[] = [];
  let merged = 0;
  for (const [sid, list] of groups) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const keep = sorted[0];
    const others = sorted.slice(1);
    const urls = origin.get(sid);
    const url = urls ? pickPath(urls) : keep.source_url;
    const html = url ? await openOriginPage(url) : null;
    const ficha = html && url ? extractSaFicha(html, url) : null;

    const { data: before } = await sb.from("properties").select("slug,purpose,price_sale,price_rent,status,source_url").eq("id", keep.id).single();

    // Libera o external_ref dos registros que saem.
    for (const o of others) {
      await sb.from("properties").update({
        status: "inactive",
        external_ref: `${o.external_ref ?? o.id}#juntado-${keep.id}`,
        slug: o.slug.endsWith("-juntado") ? o.slug : `${o.slug}-juntado`,
      }).eq("id", o.id);
    }

    const overrides: Record<string, unknown> = {};
    for (const o of [...others].reverse()) Object.assign(overrides, o.manual_overrides ?? {});
    Object.assign(overrides, keep.manual_overrides ?? {});
    for (const k of ["price_sale", "price_rent", "purpose", "iptu", "iptu_period", "condo_fee"]) delete overrides[k];

    const anyActive = list.some((r) => r.status === "active");
    const patch: Record<string, unknown> = {
      manual_overrides: overrides,
      source_id: sid,
      condominium_id: keep.condominium_id ?? others.find((o) => o.condominium_id)?.condominium_id ?? null,
      street_id: keep.street_id ?? others.find((o) => o.street_id)?.street_id ?? null,
      // Par todo pausado continua pausado.
      status: anyActive ? "active" : "paused",
    };
    if (url) { patch.source_url = url; patch.external_ref = pathOf(url); }
    if (ficha) {
      patch.price_sale = ficha.priceSale;
      patch.price_rent = ficha.priceRent;
      patch.purpose = ficha.priceSale && ficha.priceRent ? "both" : ficha.priceRent ? "rent" : ficha.priceSale ? "sale" : undefined;
      if (ficha.condoFee != null) patch.condo_fee = ficha.condoFee;
      if (ficha.iptu != null) { patch.iptu = ficha.iptu; patch.iptu_period = ficha.iptuPeriod; }
      if (!patch.purpose) delete patch.purpose;
    }
    const { error } = await sb.from("properties").update(patch).eq("id", keep.id);
    if (error) { log(`juntar ${sid}: ${error.message}`); continue; }
    await regenerateSeoForIds(sb, [keep.id]);

    const target = `/imoveis/${keep.slug}`;
    for (const o of others) {
      const old = `/imoveis/${o.slug}`;
      await sb.from("seo_redirects").update({ new_url: target }).eq("new_url", old);
      const { data: ex } = await sb.from("seo_redirects").select("id").eq("old_url", old).maybeSingle();
      if (ex) await sb.from("seo_redirects").update({ new_url: target, active: true, redirect_type: 301 }).eq("id", ex.id);
      else await sb.from("seo_redirects").insert({ old_url: old, new_url: target, redirect_type: 301, active: true });
      changedUrls.push(propUrl(o.slug));
    }
    changedUrls.push(propUrl(keep.slug));
    const { data: after } = await sb.from("properties").select("slug,purpose,price_sale,price_rent,status,source_url,seo_title").eq("id", keep.id).single();
    examples.push({ source_id: sid, before, after, removed: others.map((o) => o.slug) });
    merged++;
  }
  return { merged, changedUrls, examples };
}

/** Item 2: atualiza só o caminho de origem guardado. */
export async function updateChangedPaths(sb: SB, rows: Row[], origin: OriginMap) {
  let updated = 0;
  const examples: unknown[] = [];
  const bySid = new Map<string, Row[]>();
  for (const r of rows) {
    if (r.status === "inactive" || r.status === "sold") continue;
    const sid = sidOf(r);
    if (sid) bySid.set(sid, [...(bySid.get(sid) ?? []), r]);
  }
  for (const [sid, list] of bySid) {
    const urls = origin.get(sid);
    if (!urls || list.length !== 1) continue;
    const r = list[0];
    const paths = urls.map(pathOf);
    const cur = pathOf(r.external_ref?.startsWith("/") ? r.external_ref : r.source_url);
    if (paths.includes(cur) && paths.includes(pathOf(r.source_url))) continue;
    const url = pickPath(urls);
    const { error } = await sb.from("properties").update({ source_url: url, external_ref: pathOf(url), source_id: sid }).eq("id", r.id);
    if (!error) {
      updated++;
      if (examples.length < 5) examples.push({ source_id: sid, slug: r.slug, before: r.source_url, after: url });
    }
  }
  return { updated, examples };
}

const PRIORITY = (url: string) => {
  const seg = new URL(url).pathname.split("/")[3] ?? "";
  return seg === "barueri" ? 0 : seg === "santana-de-parnaiba" ? 1 : 2;
};

/** Importa um imóvel novo da origem com título, slug e SEO no padrão atual. */
export async function importFromOrigin(sb: SB, url: string, cities: OfficialCity[]): Promise<{ id: string; slug: string } | null> {
  const html = await openOriginPage(url);
  if (!html) return null;
  const { listing: l } = parseSaImoveis(html, url);
  const ficha = extractSaFicha(html, url);
  const city = resolveOfficialCity(l.address.city, url, cities);
  const src = {
    property_type: ficha.propertyType ?? l.propertyTypeText, purpose: l.purpose, city: city ?? l.address.city,
    neighborhood: l.address.neighborhood, condominium_name: null, external_ref: pathOf(url), source_url: url,
  } as unknown as SeoSource;
  let slug = buildSeoSlug(src, pathOf(url));
  const { data: clash } = await sb.from("properties").select("id").eq("slug", slug).maybeSingle();
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;
  const payload = {
    external_ref: pathOf(url), source_url: url, source_id: ficha.sourceId, slug,
    title: l.title ?? slug, purpose: l.purpose, property_type: ficha.propertyType,
    internal_code: ficha.code, city: city ?? l.address.city, state: l.address.state,
    neighborhood: l.address.neighborhood, condominium_name: ficha.empreendimento,
    address: l.address.street, address_number: l.address.number, postal_code: l.address.postalCode,
    price_sale: l.prices.sale, price_rent: l.prices.rent, condo_fee: l.prices.condoFee, iptu: l.prices.iptu,
    iptu_period: ficha.iptu != null ? ficha.iptuPeriod : null,
    area_total: l.areas.total ?? l.areas.land, area_built: l.areas.built, area_useful: l.areas.useful,
    bedrooms: l.rooms.bedrooms, suites: l.rooms.suites, bathrooms: l.rooms.bathrooms, lavabos: l.rooms.lavabos,
    parking: l.rooms.parking, parking_covered: l.rooms.parkingCovered, parking_uncovered: l.rooms.parkingUncovered,
    description: l.descriptionText, descricao_original: l.descriptionText, images: l.images,
    status: "active", review_status: ficha.propertyTypeRaw ? "needs_review" : null,
    extracted_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
    raw: { import_source: "conciliacao-diaria", features: l.features },
  };
  const { data, error } = await sb.from("properties").insert(payload).select("id,slug").single();
  if (error) throw new Error(`${ficha.sourceId}: ${error.message}`);
  await regenerateSeoForIds(sb, [data.id]);
  return data;
}

export type RunOptions = { triggeredBy: string; skipImports?: boolean };

/** Rotina completa pela API Tokko. Sempre registra a execução em source_reconciliation_runs. */
export const RECONCILIATION_SUSPENDED = false;

export async function runReconciliation(sb: SB, opts: RunOptions) {
  if (RECONCILIATION_SUSPENDED) {
    return { status: "blocked", error: "Conciliação suspensa. Nada foi alterado.", errors: [] as string[] };
  }
  const { data: run } = await sb.from("source_reconciliation_runs").insert({ triggered_by: opts.triggeredBy }).select("id").single();
  let errors: string[] = [];
  const finish = async (status: string, fields: Record<string, unknown>) => {
    await sb.from("source_reconciliation_runs").update({
      ...fields, status, errors, finished_at: new Date().toISOString(),
    }).eq("id", run.id);
    return { status, ...fields, errors };
  };
  try {
    const { fetchTokkoProperties } = await import("./tokko-api.server");
    const { syncFromTokko, officialUrlsFromSitemap } = await import("./tokko-sync.server");
    const api = await fetchTokkoProperties();
    const minimum = Math.ceil(ORIGIN_BASELINE * MIN_RATIO);
    if (api.length < minimum) {
      return await finish("blocked", {
        origin_count: api.length,
        error: `API trouxe ${api.length} imóveis, abaixo de 80% da base (${minimum} de ${ORIGIN_BASELINE}). Nada foi alterado.`,
      });
    }
    const officialUrls = await officialUrlsFromSitemap();
    const { data: cities } = await sb.from("cities").select("name,slug,uf,sort_priority");
    const r = await syncFromTokko(sb, api, {
      apply: true, importLimit: opts.skipImports ? 0 : MAX_IMPORTS_PER_DAY, officialUrls, cities: cities ?? [],
      missesBeforePause: MISSES_BEFORE_PAUSE,
      // A API é a fonte: 2 execuções seguidas sem o imóvel bastam (sem abrir página antiga).
      confirmGone: async () => true,
    });
    errors = r.errors;
    let indexnow: unknown = null;
    if (r.changedUrls.length) indexnow = await submitIndexNow(SITE_HOST, r.changedUrls);
    const { count: active } = await sb.from("properties").select("id", { count: "exact", head: true }).eq("status", "active");
    const { count: pausedTotal } = await sb.from("properties").select("id", { count: "exact", head: true }).eq("status", "paused");
    return await finish("ok", {
      origin_count: api.length, sitemap_count: Object.keys(officialUrls).length,
      portal_active: active, portal_paused: pausedTotal,
      paused: r.paused, reactivated: r.reactivated, imported: r.imported, merged: 0, paths_updated: r.updated,
      missing_in_portal: Math.max(0, r.new_in_api - r.imported),
      details: { source: "tokko-api", indexnow, updated: r.updated, photos_changed: r.photos_changed,
        seo_regenerated: r.seo_regenerated, deactivated: r.deactivated, created: r.imported, ambiguous: r.ambiguous, missing_active: r.missingReport },
    });
  } catch (e) {
    return await finish("failed", { error: e instanceof Error ? e.message : String(e) });
  }
}
