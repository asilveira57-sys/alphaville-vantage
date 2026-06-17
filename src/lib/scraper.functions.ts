import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SOURCE = "https://saimoveisalphaville.com.br";
const SITEMAP = `${SOURCE}/sitemap.xml`;
const UA = "SAImoveisPortalBot/1.0 (+https://saimoveisalphaville.com.br)";

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
      const res = await fetch(url, {
        headers: { "user-agent": UA, "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
        redirect: "follow",
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
    return /^\/(alugar|comprar|venda|imoveis\/referencia-)/i.test(p);
  } catch { return false; }
}

function pickMeta(html: string, prop: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i");
  return html.match(re)?.[1];
}

function extractTitle(html: string): string {
  return pickMeta(html, "og:title") ?? html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? "Imóvel";
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

function inferPurpose(url: string, html: string): "rent" | "sale" | null {
  const p = new URL(url).pathname;
  if (/^\/alugar/i.test(p)) return "rent";
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
      if (!sm || !sm.ok) throw new Error(`Sitemap inacessível (${sm?.status ?? "no response"})`);
      const xml = await sm.text();
      const allUrls = extractSitemapUrls(xml).filter(isPropertyUrl);
      discovered = allUrls.length;

      // 2) Prioriza URLs ainda não vistas (ou vistas há mais tempo)
      const externalRefs = allUrls.map((u) => new URL(u).pathname);
      const { data: known } = await supabaseAdmin
        .from("properties")
        .select("external_ref,last_seen_at")
        .in("external_ref", externalRefs);
      const seenMap = new Map<string, string | null>();
      (known ?? []).forEach((r) => { if (r.external_ref) seenMap.set(r.external_ref, r.last_seen_at); });

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
          const title = extractTitle(html);
          const description = pickMeta(html, "og:description") ?? "";
          const images = extractImages(html, item.url);
          const purpose = inferPurpose(item.url, html);
          const refTail = item.ref.split("/").filter(Boolean).pop() ?? "";
          const slug = `${slugify(title)}-${refTail}`;

          const price = extractNumber(html, /R\$\s*([\d.,]+)/);
          const bedrooms = extractNumber(html, /(\d+)\s*(?:quartos?|dorm)/i);
          const area = extractNumber(html, /([\d.,]+)\s*m[²2]/i);

          await supabaseAdmin.from("properties").upsert({
            external_ref: item.ref,
            source_url: item.url,
            slug,
            title,
            description,
            purpose,
            images,
            price_rent: purpose === "rent" ? price : null,
            price_sale: purpose === "sale" ? price : null,
            bedrooms: bedrooms ?? null,
            area_useful: area ?? null,
            raw: { html_excerpt: html.slice(0, 4000) },
            status: "active",
            last_seen_at: new Date().toISOString(),
          }, { onConflict: "external_ref" });
          upserted++;
        } catch {
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
