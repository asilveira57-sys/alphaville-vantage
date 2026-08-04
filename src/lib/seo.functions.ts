import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { submitIndexNow } from "./indexnow.server";

const SITE_URL = "https://alphaville-vantage.lovable.app";
const SITE_HOST = "alphaville-vantage.lovable.app";

// Rotas institucionais fixas (mesmo conjunto do sitemap)
const STATIC_ROUTES = [
  "/", "/blog", "/alphaville", "/guia-alphaville", "/guia-tambore",
  "/guia-barueri", "/guia-santana-de-parnaiba", "/condominios", "/bairros",
  "/escolas", "/restaurantes", "/empresas", "/mercado-imobiliario",
  "/historia", "/meio-ambiente", "/investimentos", "/imoveis",
  "/quem-somos", "/como-trabalhamos", "/servicos", "/areas-de-atuacao",
  "/perguntas-frequentes", "/contato", "/transparencia",
  "/politica-de-atendimento", "/politica-de-privacidade", "/politica-de-cookies",
  "/lgpd", "/termos-de-uso", "/aviso-legal", "/mapa-do-site",
];

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId, _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

async function getAllSitemapUrls() {
  const sb = publicClient();
  const [propRows, pageRows] = await Promise.all([
    fetchAllRows<{ slug: string; updated_at: string | null }>((f, t) =>
      sb.from("properties").select("slug,updated_at").eq("status", "active")
        .order("slug", { ascending: true }).range(f, t),
    ),
    fetchAllRows<{ slug: string; content_type: string; updated_at: string | null }>((f, t) =>
      sb.from("editorial_pages").select("slug,content_type,updated_at").eq("status", "published")
        .order("slug", { ascending: true }).range(f, t),
    ),
  ]);
  const props = { data: propRows };
  const pages = { data: pageRows };

  type Entry = { url: string; path: string; type: string; lastmod: string | null };
  const entries: Entry[] = [];

  for (const p of STATIC_ROUTES) {
    entries.push({ url: `${SITE_URL}${p}`, path: p, type: "institucional", lastmod: null });
  }
  for (const p of props.data ?? []) {
    const path = `/imoveis/${p.slug}`;
    entries.push({ url: `${SITE_URL}${path}`, path, type: "imovel", lastmod: p.updated_at });
  }
  for (const e of pages.data ?? []) {
    const base = e.content_type === "condominio" ? "/condominios"
      : e.content_type === "bairro" ? "/bairros"
      : e.content_type === "blog" ? "/blog"
      : null;
    if (!base) continue;
    const path = `${base}/${e.slug}`;
    const type = e.content_type === "condominio" ? "condominio"
      : e.content_type === "bairro" ? "bairro"
      : "blog";
    entries.push({ url: `${SITE_URL}${path}`, path, type, lastmod: e.updated_at });
  }
  return entries;
}

// ---------- OVERVIEW ----------

export const getSeoOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const entries = await getAllSitemapUrls();
    const counts = { institucional: 0, imovel: 0, blog: 0, condominio: 0, bairro: 0 };
    for (const e of entries) {
      counts[e.type as keyof typeof counts] = (counts[e.type as keyof typeof counts] ?? 0) + 1;
    }
    const { data: state } = await context.supabase.from("seo_state").select("*").maybeSingle();
    return {
      total: entries.length,
      counts,
      sitemapUrl: `${SITE_URL}/sitemap.xml`,
      sitemapPurgedAt: state?.sitemap_purged_at ?? null,
      indexnowLastRunAt: state?.indexnow_last_run_at ?? null,
    };
  });

// ---------- LIST URLS ----------

export const listIndexableUrls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    type: z.enum(["all", "institucional", "imovel", "blog", "condominio", "bairro"]).default("all"),
    search: z.string().optional(),
  }).default({ type: "all" }).parse(d ?? { type: "all" }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const entries = await getAllSitemapUrls();
    return entries.filter((e) => {
      if (data.type !== "all" && e.type !== data.type) return false;
      if (data.search && !e.path.toLowerCase().includes(data.search.toLowerCase())) return false;
      return true;
    });
  });

// ---------- AUDIT ----------

type AuditIssue = {
  severity: "error" | "warning";
  message: string;
  page_id: string;
  page_title: string;
  page_slug: string;
  page_type: string;
  edit_url: string;
};

export const runSeoAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const issues: AuditIssue[] = [];

    // Editorial pages
    const { data: pages } = await context.supabase.from("editorial_pages")
      .select("id,title,slug,content_type,meta_title,meta_description,featured_image,og_title,og_image,canonical_url,status");
    const slugCount = new Map<string, number>();
    for (const p of pages ?? []) {
      slugCount.set(p.slug, (slugCount.get(p.slug) ?? 0) + 1);
      if (p.status !== "published") continue;
      const base = {
        page_id: p.id, page_title: p.title, page_slug: p.slug,
        page_type: p.content_type, edit_url: `/cms/${p.id}`,
      };
      if (!p.meta_title) issues.push({ severity: "error", message: "Meta title ausente", ...base });
      else if (p.meta_title.length > 60) issues.push({ severity: "warning", message: `Meta title com ${p.meta_title.length} chars (>60)`, ...base });
      if (!p.meta_description) issues.push({ severity: "error", message: "Meta description ausente", ...base });
      else if (p.meta_description.length > 160) issues.push({ severity: "warning", message: `Meta description com ${p.meta_description.length} chars (>160)`, ...base });
      if (!p.featured_image) issues.push({ severity: "warning", message: "Imagem de capa ausente", ...base });
      if (!p.og_image && !p.featured_image) issues.push({ severity: "warning", message: "OG image ausente", ...base });
      if (!p.canonical_url) issues.push({ severity: "warning", message: "Canonical URL ausente", ...base });
    }
    for (const [slug, count] of slugCount.entries()) {
      if (count > 1) {
        const p = (pages ?? []).find((r: any) => r.slug === slug);
        if (p) issues.push({
          severity: "error", message: `Slug duplicado (${count} páginas)`,
          page_id: p.id, page_title: p.title, page_slug: slug,
          page_type: p.content_type, edit_url: `/cms/${p.id}`,
        });
      }
    }

    // Properties
    const { data: props } = await context.supabase.from("properties")
      .select("id,title,slug,seo_title,seo_description,images,status")
      .eq("status", "active");
    for (const p of props ?? []) {
      const base = {
        page_id: p.id, page_title: p.title, page_slug: p.slug,
        page_type: "imovel", edit_url: `/audit/${p.id}`,
      };
      if (!p.seo_title) issues.push({ severity: "error", message: "SEO title ausente", ...base });
      else if (p.seo_title.length > 60) issues.push({ severity: "warning", message: `SEO title com ${p.seo_title.length} chars (>60)`, ...base });
      if (!p.seo_description) issues.push({ severity: "error", message: "SEO description ausente", ...base });
      else if (p.seo_description.length > 160) issues.push({ severity: "warning", message: `SEO description com ${p.seo_description.length} chars (>160)`, ...base });
      const imgs = Array.isArray(p.images) ? p.images : [];
      if (!imgs.length) issues.push({ severity: "warning", message: "Sem imagens", ...base });
    }

    // sort: errors first
    issues.sort((a, b) => (a.severity === "error" ? -1 : 1) - (b.severity === "error" ? -1 : 1));
    return {
      total: issues.length,
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      issues,
    };
  });

// ---------- PURGE + INDEXNOW ----------

async function purgeCacheInternal(ctx: { supabase: any }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date().toISOString();
  await supabaseAdmin.from("seo_state").update({
    sitemap_purged_at: now, updated_at: now,
  }).eq("id", true);
  await supabaseAdmin.from("seo_runs").insert({
    kind: "purge", urls_count: 0, http_status: 200, triggered_by: "manual",
  });
  return now;
}

export const purgeSitemapCache = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const at = await purgeCacheInternal(context);
    return { purged_at: at };
  });

export const triggerIndexNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    urls: z.array(z.string().url()).optional(),
    all: z.boolean().optional(),
  }).default({}).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let urls = data.urls ?? [];
    if (data.all || !urls.length) {
      const entries = await getAllSitemapUrls();
      urls = entries.map((e) => e.url);
    }
    const result = await submitIndexNow(SITE_HOST, urls);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    await supabaseAdmin.from("seo_runs").insert({
      kind: "indexnow",
      urls_count: result.urlsSent,
      http_status: result.status,
      error: result.error ?? null,
      triggered_by: "manual",
    });
    if (result.ok) {
      await supabaseAdmin.from("seo_state").update({
        indexnow_last_run_at: now, updated_at: now,
      }).eq("id", true);
    }
    return result;
  });

export const regenerateAndNotify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const purged_at = await purgeCacheInternal(context);
    const entries = await getAllSitemapUrls();
    const urls = entries.map((e) => e.url);
    const result = await submitIndexNow(SITE_HOST, urls);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    await supabaseAdmin.from("seo_runs").insert({
      kind: "indexnow", urls_count: result.urlsSent,
      http_status: result.status, error: result.error ?? null, triggered_by: "manual",
    });
    if (result.ok) {
      await supabaseAdmin.from("seo_state").update({
        indexnow_last_run_at: now, updated_at: now,
      }).eq("id", true);
    }
    return { purged_at, indexnow: result, total_urls: urls.length };
  });

// ---------- RUNS HISTORY ----------

export const listSeoRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("seo_runs")
      .select("*").order("created_at", { ascending: false }).limit(30);
    return data ?? [];
  });

// ---------- AUTO NOTIFY (chamado por outros serverFns) ----------

// Fire-and-forget: purga cache do sitemap e notifica IndexNow.
// NÃO importar este helper diretamente em rotas — importe em outros serverFns
// e chame após operações de publish/upsert.
export async function autoNotifyPublish(paths: string[]) {
  if (!paths.length) return;
  const urls = paths.map((p) => (p.startsWith("http") ? p : `${SITE_URL}${p.startsWith("/") ? "" : "/"}${p}`));
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    await supabaseAdmin.from("seo_state").update({
      sitemap_purged_at: now, updated_at: now,
    }).eq("id", true);
    const result = await submitIndexNow(SITE_HOST, urls);
    await supabaseAdmin.from("seo_runs").insert({
      kind: "indexnow", urls_count: result.urlsSent,
      http_status: result.status, error: result.error ?? null, triggered_by: "auto",
    });
    if (result.ok) {
      await supabaseAdmin.from("seo_state").update({
        indexnow_last_run_at: now, updated_at: now,
      }).eq("id", true);
    }
  } catch (e) {
    console.error("[autoNotifyPublish] falhou:", e);
  }
}
