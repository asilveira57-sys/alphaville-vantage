import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SOURCE = "https://saimoveisalphaville.com.br";

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

function extractLinks(html: string, base: string): string[] {
  const set = new Set<string>();
  const re = /href=["']([^"'#?]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1];
    try {
      const u = new URL(href, base);
      if (u.hostname.includes("saimoveisalphaville") && /imovel|detalhe|codigo|ref/i.test(u.pathname)) {
        set.add(u.toString());
      }
    } catch { /* ignore */ }
  }
  return [...set];
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
      if (!/(logo|icone|placeholder|whatsapp)/i.test(u.pathname)) set.add(u.toString());
    } catch { /* ignore */ }
  }
  return [...set].slice(0, 12);
}

export const runScraper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: run, error: runErr } = await supabaseAdmin.from("scraper_runs").insert({
      status: "running", triggered_by: context.userId,
    }).select().single();
    if (runErr) throw new Error(runErr.message);

    try {
      const indexUrls = [
        `${SOURCE}/`,
        `${SOURCE}/imoveis`,
        `${SOURCE}/locacao`,
        `${SOURCE}/venda`,
      ];
      const propertyUrls = new Set<string>();
      let pages = 0;

      for (const u of indexUrls) {
        try {
          const res = await fetch(u, { headers: { "user-agent": "SAImoveisPortalBot/1.0" } });
          if (!res.ok) continue;
          pages++;
          const html = await res.text();
          extractLinks(html, u).forEach((l) => propertyUrls.add(l));
        } catch { /* ignore */ }
      }

      let upserted = 0;
      const list = [...propertyUrls].slice(0, 40);
      for (const url of list) {
        try {
          const res = await fetch(url, { headers: { "user-agent": "SAImoveisPortalBot/1.0" } });
          if (!res.ok) continue;
          pages++;
          const html = await res.text();
          const title = extractTitle(html);
          const description = pickMeta(html, "og:description") ?? "";
          const images = extractImages(html, url);
          const slug = slugify(title) || slugify(new URL(url).pathname);
          const externalRef = new URL(url).pathname;

          const purpose = /loca[cç][aã]o|alug/i.test(html) ? "rent"
            : /venda/i.test(html) ? "sale" : null;

          await supabaseAdmin.from("properties").upsert({
            external_ref: externalRef,
            source_url: url,
            slug,
            title,
            description,
            purpose,
            images,
            raw: { html_excerpt: html.slice(0, 2000) },
            status: "active",
            last_seen_at: new Date().toISOString(),
          }, { onConflict: "external_ref" });
          upserted++;
        } catch { /* ignore single property error */ }
      }

      await supabaseAdmin.from("scraper_runs").update({
        status: "success", pages_crawled: pages,
        properties_upserted: upserted,
        finished_at: new Date().toISOString(),
      }).eq("id", run.id);

      return { runId: run.id, pages, upserted, discovered: propertyUrls.size };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin.from("scraper_runs").update({
        status: "error", error: msg, finished_at: new Date().toISOString(),
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
      .from("scraper_runs").select("*").order("started_at", { ascending: false }).limit(20);
    return data ?? [];
  });
