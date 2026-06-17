import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SOURCE = "https://saimoveisalphaville.com.br";
const SITEMAP = `${SOURCE}/sitemap.xml`;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Tempo máximo de uma execução (deixa folga até o timeout do worker)
const RUN_BUDGET_MS = 50_000;
// Pausa entre requisições ao site de origem (rate limit defensivo)
const REQUEST_DELAY_MS = 350;
// Tentativas em caso de 429/5xx
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 110);

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

function isPropertyUrl(u: string): boolean {
  try {
    const p = new URL(u).pathname;
    return /^\/(alugar|comprar|comprar-ou-alugar)\//i.test(p);
  } catch { return false; }
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
  const re = /<img[^>]+src=["']([^"']+\.(?:jpe?g|png|webp))[^"']*["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], base);
      if (!/(logo|icone|placeholder|whatsapp|favicon|mini_)/i.test(u.pathname)) set.add(u.toString());
    } catch { /* ignore */ }
  }
  // Also collect cdn.uso.com.br full-size images from inline data
  const re2 = /https?:\/\/cdn\.uso\.com\.br\/[^"'\s)]+\.(?:jpe?g|png|webp)/gi;
  let m2: RegExpExecArray | null;
  while ((m2 = re2.exec(html))) {
    const u = m2[0];
    if (!/mini_|logo|favicon/i.test(u)) set.add(u);
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
      const externalRefs = allUrls.map((u) => new URL(u).pathname);
      const knownRows: { external_ref: string | null; last_seen_at: string | null }[] = [];
      for (const refs of chunk(externalRefs, 500)) {
        const { data } = await supabaseAdmin
          .from("properties")
          .select("external_ref,last_seen_at")
          .in("external_ref", refs);
        knownRows.push(...(data ?? []));
      }
      const seenMap = new Map<string, string | null>();
      knownRows.forEach((r) => { if (r.external_ref) seenMap.set(r.external_ref, r.last_seen_at); });

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
          const title = extractPropertyTitle(html, item.url);
          const description = pickMeta(html, "og:description") ?? "";
          const images = extractImages(html, item.url);
          const purpose = inferPurpose(item.url, html);
          const pathParts = item.ref.split("/").filter(Boolean);
          const refTail = pathParts.at(-1) ?? "";
          const slug = `${slugify(title)}-${refTail}`;

          const price = extractNumber(html, /(?:valor\s*)?(?:aluguel|loca[cç][aã]o|venda)[^R]{0,40}R\$\s*([\d.,]+)/i) ?? extractNumber(html, /R\$\s*([\d.,]+)/);
          const bedrooms = extractNumber(html, /(\d+)\s*(?:quartos?|dormit[oó]rios?|dorm)/i);
          const parking = extractNumber(html, /(\d+)\s*vagas?/i);
          const suites = extractNumber(html, /(\d+)\s*su[ií]tes?/i);
          const area = extractNumber(html, /([\d.,]+)\s*m[²2]\s*(?:útil|util|constru[ií]da)?/i);

          const { error: upsertErr } = await supabaseAdmin.from("properties").upsert({
            external_ref: item.ref,
            source_url: item.url,
            slug,
            title,
            description,
            purpose,
            property_type: pathParts.at(-2)?.replace(/-/g, " ") ?? null,
            images,
            price_rent: purpose === "rent" ? price : null,
            price_sale: purpose === "sale" ? price : null,
            bedrooms: bedrooms ?? null,
            suites: suites ?? null,
            parking: parking ?? null,
            area_useful: area ?? null,
            raw: { html_excerpt: html.slice(0, 4000) },
            status: "active",
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
