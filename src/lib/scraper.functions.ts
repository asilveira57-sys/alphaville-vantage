import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parsePropertyText, computeReviewStatus } from "./property-parser";
import { buildSeoBody, buildSeoTitle, buildSeoDescription, buildSeoSlug, auditProperty, type SeoSource } from "./property-seo";
import { generateOpeningWithAI } from "./property-seo.functions";

const SOURCE = "https://saimoveisalphaville.com.br";
const SITEMAP = `${SOURCE}/sitemap.xml`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Tempo máximo de uma execução (deixa folga até o timeout do worker)
const RUN_BUDGET_MS = 55_000;
// Pausa entre requisições ao site de origem (rate limit defensivo)
const REQUEST_DELAY_MS = 350;
// Tentativas em caso de 429/5xx
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 110);

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b([a-zà-ÿ])/g, (m) => m.toUpperCase());

/**
 * Garante guia editorial para o bairro. Se não existir guia/bairro com slug equivalente,
 * cria rascunho com estrutura padrão (História, Mobilidade, Serviços, Qualidade de Vida).
 * Retorna o slug usado (para vincular a outros conteúdos).
 */
async function ensureBairroGuia(
  admin: any,
  neighborhood: string | null | undefined,
  city: string | null | undefined,
): Promise<string | null> {
  if (!neighborhood) return null;
  const baseSlug = slugify(neighborhood + (city ? `-${city}` : ""));
  if (!baseSlug) return null;
  const { data: existing } = await admin
    .from("editorial_pages")
    .select("slug")
    .in("content_type", ["bairro", "guia"])
    .ilike("title", neighborhood)
    .maybeSingle();
  if (existing) return existing.slug;
  const title = titleCase(neighborhood) + (city ? ` (${titleCase(city)})` : "");
  const html = `
<p>Guia gerado automaticamente. Edite no CMS para complementar com fotos, dados e curiosidades.</p>
<h2 id="historia">História</h2><p>Conteúdo a ser preenchido.</p>
<h2 id="mobilidade">Mobilidade</h2><p>Conteúdo a ser preenchido.</p>
<h2 id="servicos">Serviços</h2><p>Conteúdo a ser preenchido.</p>
<h2 id="qualidade-de-vida">Qualidade de Vida</h2><p>Conteúdo a ser preenchido.</p>`.trim();
  const { error } = await admin.from("editorial_pages").insert({
    slug: baseSlug,
    title,
    content_type: "guia",
    status: "draft",
    html_content: html,
    excerpt: `Guia do bairro ${titleCase(neighborhood)}${city ? ` em ${titleCase(city)}` : ""}.`,
    tags: [titleCase(neighborhood), city ? titleCase(city) : null].filter(Boolean),
    meta_title: `${titleCase(neighborhood)} — Guia do bairro`,
    meta_description: `Tudo sobre ${titleCase(neighborhood)}: história, mobilidade, serviços e qualidade de vida.`,
  });
  if (error && !/duplicate key/i.test(error.message)) {
    console.error("ensureBairroGuia failed", error.message);
    return null;
  }
  return baseSlug;
}

/**
 * Garante registro em condominiums + editorial_pages (condominio) para o nome.
 * Retorna { condominiumId, slug } para vincular ao imóvel.
 */
async function ensureCondominio(
  admin: any,
  condoName: string | null | undefined,
  neighborhood: string | null | undefined,
  city: string | null | undefined,
  bairroSlug: string | null,
  coverImage: string | null,
): Promise<{ id: string; slug: string } | null> {
  if (!condoName) return null;
  const slug = slugify(condoName);
  if (!slug) return null;
  // Garante linha em condominiums
  let { data: condo } = await admin
    .from("condominiums").select("id,slug").eq("slug", slug).maybeSingle();
  if (!condo) {
    const region = [neighborhood, city].filter((s): s is string => !!s).map(titleCase).join(" — ") || null;
    const { data: inserted, error } = await admin.from("condominiums").insert({
      slug, name: titleCase(condoName), region,
      cover_image_url: coverImage, status: "active",
    }).select("id,slug").single();
    if (error) {
      console.error("ensureCondominio insert failed", error.message);
      return null;
    }
    condo = inserted;
  }
  // Garante editorial_pages condominio
  const { data: page } = await admin
    .from("editorial_pages").select("id")
    .eq("content_type", "condominio").eq("slug", slug).maybeSingle();
  if (!page) {
    const html = `
<p>Página gerada automaticamente. Edite no CMS para complementar com descrição, infraestrutura, fotos e diferenciais.</p>
<h2 id="sobre">Sobre o condomínio</h2><p>Conteúdo a ser preenchido.</p>
<h2 id="infraestrutura">Infraestrutura e lazer</h2><p>Conteúdo a ser preenchido.</p>
<h2 id="localizacao">Localização</h2><p>${neighborhood ? titleCase(neighborhood) : ""}${city ? `, ${titleCase(city)}` : ""}.</p>`.trim();
    await admin.from("editorial_pages").insert({
      slug, title: titleCase(condoName), content_type: "condominio",
      status: "draft", html_content: html,
      excerpt: `Conheça o condomínio ${titleCase(condoName)}${neighborhood ? ` em ${titleCase(neighborhood)}` : ""}.`,
      tags: [titleCase(condoName), neighborhood ? titleCase(neighborhood) : null, city ? titleCase(city) : null].filter(Boolean),
      related_neighborhood: bairroSlug,
      related_condominium: condo.id,
      featured_image: coverImage,
      meta_title: `${titleCase(condoName)} — ${neighborhood ? titleCase(neighborhood) : "Condomínio"}`,
      meta_description: `${titleCase(condoName)}: infraestrutura, localização e imóveis disponíveis${neighborhood ? ` em ${titleCase(neighborhood)}` : ""}.`,
    });
  }
  return { id: condo.id, slug: condo.slug };
}


async function politeFetch(url: string): Promise<Response | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const requestUrl = new URL(url);
      requestUrl.searchParams.set("_t", `${Date.now()}${Math.random().toString(36).slice(2, 8)}`);
      const res = await fetch(requestUrl.toString(), {
        headers: {
          "user-agent": UA,
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
          "cache-control": "no-cache",
          "pragma": "no-cache",
        },
        redirect: "follow",
        cache: "no-store",
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = Math.min(8000, 800 * Math.pow(2, attempt));
        await sleep(wait);
        continue;
      }
      return res;
    } catch {
      await sleep(500 * (attempt + 1));
    }
  }
  return null;
}

const uniq = <T,>(items: T[]) => [...new Set(items)];

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toAbsoluteUrl(url: string): string | null {
  try { return new URL(url, SOURCE).toString(); } catch { return null; }
}



function extractSitemapUrls(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1].trim());
  return out;
}

// Tipos válidos de imóvel aceitos pela whitelist de URL canônica.
const PROPERTY_TYPE_SLUGS = new Set([
  "apartamento", "casa", "cobertura", "sala", "terreno", "predio",
  "galpao", "sobrado", "loja", "flat", "chacara", "sitio", "fazenda",
  "area", "conjunto", "kitnet", "studio", "duplex", "triplex", "lote",
]);

// Aceita SOMENTE o padrão canônico de página de detalhe:
//   /{alugar|comprar|comprar-ou-alugar}/{uf}/{cidade}/{bairro}/{tipo}/{id}
// Rejeita URLs do sitemap antigo que retornam página de busca como fallback
// (ex.: ".../bairro1/bairro2./apartamento/123" → 200 mas é listagem genérica).
function isPropertyUrl(u: string): boolean {
  try {
    const p = new URL(u).pathname;
    if (!/^\/(alugar|comprar|comprar-ou-alugar)\//i.test(p)) return false;
    const parts = p.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts.length !== 6) return false;
    // Nenhum segmento pode conter ponto (descarta "alphaville." e similares).
    if (parts.some((s) => s.includes("."))) return false;
    // UF (2 letras).
    if (!/^[a-z]{2}$/i.test(parts[1])) return false;
    // Tipo na whitelist.
    if (!PROPERTY_TYPE_SLUGS.has(parts[4].toLowerCase())) return false;
    // Último segmento = id numérico.
    if (!/^\d+$/.test(parts[5])) return false;
    return true;
  } catch { return false; }
}

// Salvaguarda pós-fetch: detecta páginas de listagem servidas como fallback.
function looksLikeSearchFallback(html: string): boolean {
  const title = (html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "").toLowerCase();
  const og = (pickMeta(html, "og:title") ?? "").toLowerCase();
  return /resultados encontrados|p[aá]gina \d+/.test(title)
      || /resultados encontrados|p[aá]gina \d+/.test(og);
}

function extractPropertyLinks(html: string, base: string): string[] {
  const out: string[] = [];
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const absolute = toAbsoluteUrl(m[1]);
    if (absolute && isPropertyUrl(absolute)) out.push(new URL(absolute).origin === SOURCE ? absolute : absolute.replace(/^http:/, "https:"));
  }
  return uniq(out.map((u) => new URL(u, base).toString().split("#")[0]));
}

async function discoverFromListings(): Promise<string[]> {
  const urls: string[] = [];
  for (const section of ["imoveis", "comprar", "alugar"]) {
    for (let page = 1; page <= 8; page++) {
      const listUrl = page === 1 ? `${SOURCE}/${section}` : `${SOURCE}/${section}/pagina-${page}/`;
      const res = await politeFetch(listUrl);
      if (!res?.ok) break;
      const html = await res.text();
      const links = extractPropertyLinks(html, listUrl);
      if (!links.length) break;
      urls.push(...links);
      await sleep(REQUEST_DELAY_MS);
    }
  }
  return uniq(urls).filter(isPropertyUrl);
}

function pickMeta(html: string, prop: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
  return html.match(re)?.[1];
}

function extractTitle(html: string): string {
  return pickMeta(html, "og:title") ?? html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? "Imóvel";
}

function extractPropertyTitle(html: string, url: string): string {
  const h1 = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const h2 = stripTags(html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? "");
  const type = new URL(url).pathname.split("/").filter(Boolean).at(-2)?.replace(/-/g, " ") ?? "Imóvel";
  const title = [h1 || type, h2].filter(Boolean).join(" — ");
  return title || extractTitle(html);
}

function extractImages(html: string, base: string): string[] {
  const set = new Set<string>();
  // Site-chrome assets to skip (logos, icons, WhatsApp badges, photographer avatars, etc.)
  const isChrome = (u: string) =>
    /(logo|logos|icone|placeholder|whats|favicon|mini_|topo_|supremo_|ficha|usuarios\/)/i.test(u);

  // Prefer real property photos: cdn.uso.com.br/{accountId}/{yyyy}/{mm}/<hash>.jpg
  const reCdn = /https?:\/\/cdn\d*\.uso\.com\.br\/\d+\/\d{4}\/\d{2}\/[^"'\s)]+\.(?:jpe?g|png|webp)/gi;
  let m: RegExpExecArray | null;
  while ((m = reCdn.exec(html))) {
    if (!isChrome(m[0])) set.add(m[0]);
  }

  // Fallback: any <img src> when no CDN photos were found
  if (set.size === 0) {
    const reImg = /<img[^>]+src=["']([^"']+\.(?:jpe?g|png|webp))[^"']*["']/gi;
    let mi: RegExpExecArray | null;
    while ((mi = reImg.exec(html))) {
      try {
        const u = new URL(mi[1], base).toString();
        if (!isChrome(u)) set.add(u);
      } catch { /* ignore */ }
    }
  }
  return [...set].slice(0, 24);
}


function extractNumber(html: string, label: RegExp): number | null {
  const m = html.match(label);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function inferPurpose(url: string, html: string): "rent" | "sale" | "both" | null {
  const p = new URL(url).pathname;
  if (/^\/alugar/i.test(p)) return "rent";
  if (/^\/comprar-ou-alugar/i.test(p)) return "both";
  if (/^\/(comprar|venda)/i.test(p)) return "sale";
  if (/loca[cç][aã]o|alug/i.test(html)) return "rent";
  if (/\bvenda\b|\bcomprar\b/i.test(html)) return "sale";
  return null;
}

export const runScraper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const t0 = Date.now();

    const { data: run, error: runErr } = await supabaseAdmin.from("scraper_runs").insert({
      status: "running", triggered_by: context.userId,
    }).select().single();
    if (runErr) throw new Error(runErr.message);

    let pages = 0;
    let upserted = 0;
    let discovered = 0;
    let errors = 0;

    try {
      // 1) Sitemap
      const sm = await politeFetch(SITEMAP);
      pages++;
      if (!sm) throw new Error("Sitemap inacessível (sem resposta)");
      if (!sm.ok) throw new Error(`Sitemap inacessível (${sm.status})`);

      const xml = await sm.text();
      let allUrls = uniq(extractSitemapUrls(xml).filter(isPropertyUrl));
      if (!allUrls.length) allUrls = await discoverFromListings();
      discovered = allUrls.length;
      if (!discovered) throw new Error("Nenhuma URL de imóvel encontrada na origem");

      // 2) Prioriza URLs ainda não vistas (ou vistas há mais tempo)
      // Carrega TODOS os refs conhecidos paginando (evita estourar limite de URL do .in()).
      const seenMap = new Map<string, string | null>();
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error: selErr } = await supabaseAdmin
          .from("properties")
          .select("external_ref,last_seen_at")
          .order("external_ref", { ascending: true })
          .range(from, from + PAGE - 1);
        if (selErr) throw new Error(`Falha ao listar refs existentes: ${selErr.message}`);
        const rows = data ?? [];
        for (const r of rows) if (r.external_ref) seenMap.set(r.external_ref, r.last_seen_at);
        if (rows.length < PAGE) break;
      }


      const queue = allUrls
        .map((u) => ({ url: u, ref: new URL(u).pathname, lastSeen: seenMap.get(new URL(u).pathname) ?? null }))
        .sort((a, b) => {
          if (!a.lastSeen && b.lastSeen) return -1;
          if (a.lastSeen && !b.lastSeen) return 1;
          return (a.lastSeen ?? "").localeCompare(b.lastSeen ?? "");
        });

      // 3) Processa respeitando rate-limit e o orçamento de tempo
      for (const item of queue) {
        if (Date.now() - t0 > RUN_BUDGET_MS) break;

        await sleep(REQUEST_DELAY_MS);
        const res = await politeFetch(item.url);
        pages++;
        if (!res || !res.ok) { errors++; continue; }

        try {
          const html = await res.text();
          if (looksLikeSearchFallback(html)) { errors++; continue; }
          const title = extractPropertyTitle(html, item.url);
          const description = pickMeta(html, "og:description") ?? "";
          const images = extractImages(html, item.url);
          if (images.length === 0) { errors++; continue; }
          const purpose = inferPurpose(item.url, html);
          const pathParts = item.ref.split("/").filter(Boolean);
          const refTail = pathParts.at(-1) ?? "";
          const slug = `${slugify(title)}-${refTail}`;

          // Texto rico para o parser: descrição + porção visível do HTML
          const bodyText = stripTags(html).slice(0, 8000);
          const parsed = parsePropertyText({
            title,
            description: `${description}\n${bodyText}`,
            url: item.url,
          });

          // Fallbacks de purpose pelos preços extraídos
          let finalPurpose = purpose;
          if (!finalPurpose) {
            if (parsed.price_rent && parsed.price_sale) finalPurpose = "both";
            else if (parsed.price_rent) finalPurpose = "rent";
            else if (parsed.price_sale) finalPurpose = "sale";
          }

          const propertyType = parsed.property_type ?? pathParts.at(-2)?.replace(/-/g, " ") ?? null;

          const review_status = computeReviewStatus({
            property_type: propertyType,
            city: parsed.city,
            bedrooms: parsed.bedrooms,
            area_useful: parsed.area_useful,
            area_built: parsed.area_built,
            area_total: parsed.area_total,
            price_sale: parsed.price_sale,
            price_rent: parsed.price_rent,
          });

          // IMPORTANTE: preserva manual_overrides existentes — não sobrescreve
          // dados editados manualmente no admin.
          const { data: existing } = await supabaseAdmin
            .from("properties")
            .select("manual_overrides,descricao_original")
            .eq("external_ref", item.ref)
            .maybeSingle();
          const overrides = (existing?.manual_overrides ?? {}) as Record<string, unknown>;
          const applyOverride = <T,>(field: string, value: T): T =>
            (overrides[field] !== undefined ? (overrides[field] as T) : value);

          // Monta SeoSource para gerar SEO determinístico no momento do scrap.
          const seoSrc: SeoSource = {
            property_type: applyOverride("property_type", propertyType),
            purpose: applyOverride("purpose", finalPurpose ?? null),
            city: applyOverride("city", parsed.city),
            state: applyOverride("state", parsed.state),
            neighborhood: applyOverride("neighborhood", parsed.neighborhood),
            condominium_name: applyOverride("condominium_name", parsed.condominium_name),
            bedrooms: applyOverride("bedrooms", parsed.bedrooms),
            suites: applyOverride("suites", parsed.suites),
            bathrooms: applyOverride("bathrooms", parsed.bathrooms),
            lavabos: applyOverride("lavabos", parsed.lavabos),
            parking: applyOverride("parking", parsed.parking),
            parking_covered: applyOverride("parking_covered", parsed.parking_covered),
            parking_uncovered: applyOverride("parking_uncovered", parsed.parking_uncovered),
            area_useful: applyOverride("area_useful", parsed.area_useful),
            area_built: applyOverride("area_built", parsed.area_built),
            area_total: applyOverride("area_total", parsed.area_total),
            price_sale: applyOverride("price_sale", parsed.price_sale),
            price_rent: applyOverride("price_rent", parsed.price_rent),
            condo_fee: applyOverride("condo_fee", parsed.condo_fee),
            iptu: applyOverride("iptu", parsed.iptu),
            furnished: applyOverride("furnished", parsed.furnished),
            is_launch: applyOverride("is_launch", parsed.is_launch),
            accepts_exchange: applyOverride("accepts_exchange", parsed.accepts_exchange),
            description,
            internal_code: applyOverride("internal_code", parsed.internal_code),
          };
          const descricao_original = existing?.descricao_original ?? description;
          const opening = await generateOpeningWithAI(seoSrc);
          const descricao_seo = buildSeoBody(seoSrc, opening);
          const seo_title = buildSeoTitle(seoSrc);
          const seo_description = buildSeoDescription(seoSrc);
          const niceSlug = buildSeoSlug(seoSrc, item.ref) || slug;
          const audit = auditProperty({ ...seoSrc, descricao_seo });


          const { error: upsertErr } = await supabaseAdmin.from("properties").upsert({
            external_ref: item.ref,
            source_url: item.url,
            slug: niceSlug,
            title,
            description,
            descricao_original,
            descricao_seo,
            seo_title,
            seo_description,
            seo_generated_at: new Date().toISOString(),
            seo_used_ai: !!opening,
            purpose: applyOverride("purpose", finalPurpose),
            property_type: applyOverride("property_type", propertyType),
            city: applyOverride("city", parsed.city),
            state: applyOverride("state", parsed.state),
            neighborhood: applyOverride("neighborhood", parsed.neighborhood),
            condominium_name: applyOverride("condominium_name", parsed.condominium_name),
            images,
            price_rent: applyOverride("price_rent", parsed.price_rent),
            price_sale: applyOverride("price_sale", parsed.price_sale),
            condo_fee: applyOverride("condo_fee", parsed.condo_fee),
            iptu: applyOverride("iptu", parsed.iptu),
            bedrooms: applyOverride("bedrooms", parsed.bedrooms),
            suites: applyOverride("suites", parsed.suites),
            bathrooms: applyOverride("bathrooms", parsed.bathrooms),
            lavabos: applyOverride("lavabos", parsed.lavabos),
            parking: applyOverride("parking", parsed.parking),
            parking_covered: applyOverride("parking_covered", parsed.parking_covered),
            parking_uncovered: applyOverride("parking_uncovered", parsed.parking_uncovered),
            area_useful: applyOverride("area_useful", parsed.area_useful),
            area_built: applyOverride("area_built", parsed.area_built),
            area_total: applyOverride("area_total", parsed.area_total),
            furnished: applyOverride("furnished", parsed.furnished),
            is_launch: applyOverride("is_launch", parsed.is_launch),
            accepts_exchange: applyOverride("accepts_exchange", parsed.accepts_exchange),
            internal_code: applyOverride("internal_code", parsed.internal_code),
            raw: { html_excerpt: html.slice(0, 4000), body_excerpt: bodyText.slice(0, 4000) },
            status: "active",
            review_status,
            audit_status: audit.status,
            audit_issues: audit.issues,
            extracted_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          }, { onConflict: "external_ref", ignoreDuplicates: false });

          if (upsertErr) throw new Error(upsertErr.message);
          upserted++;
        } catch (e) {
          console.error("Crawler property failed", item.url, e instanceof Error ? e.message : String(e));
          errors++;
        }

      }

      await supabaseAdmin.from("scraper_runs").update({
        status: "success",
        pages_crawled: pages,
        properties_upserted: upserted,
        finished_at: new Date().toISOString(),
        error: errors ? `${errors} URLs com falha` : null,
      }).eq("id", run.id);

      return { runId: run.id, pages, upserted, discovered, errors, budgetReached: Date.now() - t0 > RUN_BUDGET_MS };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin.from("scraper_runs").update({
        status: "error", error: msg,
        pages_crawled: pages, properties_upserted: upserted,
        finished_at: new Date().toISOString(),
      }).eq("id", run.id);
      throw new Error(msg);
    }
  });

export const listScraperRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data } = await context.supabase
      .from("scraper_runs").select("*").order("started_at", { ascending: false });
    return data ?? [];
  });
