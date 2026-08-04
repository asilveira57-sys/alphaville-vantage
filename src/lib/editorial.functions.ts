import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanitizeHtml } from "./sanitize-html";

const CONTENT_TYPES = ["condominio", "bairro", "cidade", "guia", "blog", "institucional", "hub", "empreendimento", "parceiro"] as const;
const STATUSES = ["draft", "published", "archived"] as const;
const SCHEMA_TYPES = ["Article", "BlogPosting", "Place", "Residence", "LocalBusiness"] as const;

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

function isMeaningfullyEmptyHtml(html: string | null | undefined) {
  const raw = html ?? "";
  if (/<(img|iframe|video|audio|table)\b/i.test(raw)) return false;
  const text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}

// ---------- PUBLIC ----------

export const listPublishedByType = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({
    type: z.enum(CONTENT_TYPES),
    featuredOnly: z.boolean().optional(),
    limit: z.number().int().positive().max(200).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("editorial_pages")
      .select("id,slug,title,excerpt,content_type,featured_image,tags,related_neighborhood,display_order,published_at,is_featured")
      .eq("status", "published")
      .eq("content_type", data.type)
      .order("display_order", { ascending: true })
      .order("published_at", { ascending: false });
    if (data.featuredOnly) q = q.eq("is_featured", true);
    if (data.limit) q = q.limit(data.limit);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getEditorialBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("editorial_pages")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listRelated = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({
    type: z.enum(CONTENT_TYPES),
    excludeSlug: z.string().optional(),
    neighborhood: z.string().optional(),
    limit: z.number().int().positive().max(20).default(4),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    let q = sb.from("editorial_pages")
      .select("id,slug,title,excerpt,featured_image,content_type,related_neighborhood")
      .eq("status", "published")
      .eq("content_type", data.type)
      .limit(data.limit);
    if (data.excludeSlug) q = q.neq("slug", data.excludeSlug);
    if (data.neighborhood) q = q.eq("related_neighborhood", data.neighborhood);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- ADMIN ----------

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId, _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const listEditorialPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    contentType: z.enum(CONTENT_TYPES).optional(),
    status: z.enum(STATUSES).optional(),
    search: z.string().optional(),
    tag: z.string().optional(),
  }).default({}).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const rows = await fetchAllRows<any>((f, t) => {
      let q = context.supabase.from("editorial_pages")
        .select("id,slug,title,content_type,status,is_featured,display_order,tags,meta_title,meta_description,updated_at,published_at,html_content")
        .order("updated_at", { ascending: false });
      if (data.contentType) q = q.eq("content_type", data.contentType);
      if (data.status) q = q.eq("status", data.status);
      if (data.search) q = q.ilike("title", `%${data.search}%`);
      if (data.tag) q = q.contains("tags", [data.tag]);
      return q.range(f, t);
    });
    return rows;
  });

export const getEditorialByIdAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("editorial_pages").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const cardSchema = z.object({
  eyebrow: z.string().default(""),
  title: z.string().default(""),
  lead: z.string().default(""),
  to: z.string().default(""),
  image: z.string().optional().nullable(),
});

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2),
  slug: z.string().optional(),
  content_type: z.enum(CONTENT_TYPES),
  excerpt: z.string().optional().nullable(),
  html_content: z.string().default(""),
  featured_image: z.string().optional().nullable(),
  gallery_images: z.array(z.string()).default([]),
  status: z.enum(STATUSES).default("draft"),
  is_featured: z.boolean().default(false),
  display_order: z.number().int().default(0),
  tags: z.array(z.string()).default([]),
  related_neighborhood: z.string().optional().nullable(),
  related_condominium: z.string().uuid().optional().nullable(),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  focus_keyword: z.string().optional().nullable(),
  secondary_keywords: z.array(z.string()).default([]),
  canonical_url: z.string().optional().nullable(),
  og_title: z.string().optional().nullable(),
  og_description: z.string().optional().nullable(),
  og_image: z.string().optional().nullable(),
  schema_type: z.enum(SCHEMA_TYPES).default("Article"),
  hero_eyebrow: z.string().optional().nullable(),
  cards: z.array(cardSchema).default([]),
  // Bloco "Como a S.A. Imóveis pode ajudar"
  help_title: z.string().optional().nullable(),
  help_text: z.string().optional().nullable(),
  help_button_label: z.string().optional().nullable(),
  help_button_url: z.string().optional().nullable(),
  // CTA contextual
  cta_title: z.string().optional().nullable(),
  cta_text: z.string().optional().nullable(),
  cta_button_label: z.string().optional().nullable(),
  cta_button_url: z.string().optional().nullable(),
  // Classificações internas
  cidade: z.string().optional().nullable(),
  regiao: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  condominio: z.string().optional().nullable(),
  categoria_editorial: z.string().optional().nullable(),
  perfil_publico: z.string().optional().nullable(),
  intencao_imobiliaria: z.string().optional().nullable(),
  tipos_imovel_relacionados: z.array(z.string()).default([]),
  tags_contextuais: z.array(z.string()).default([]),
  // Radar (armazenado apenas)
  conversion_context: z.string().optional().nullable(),
  personalization_enabled: z.boolean().default(false),
  // Metadados do post
  reading_minutes: z.number().int().nonnegative().nullable().optional(),
  faq: z.array(z.object({ question: z.string().default(""), answer: z.string().default("") })).default([]),
  related_post_ids: z.array(z.string().uuid()).default([]),
  // SEO avançado
  meta_keywords: z.string().optional().nullable(),
  social_image: z.string().optional().nullable(),
  robots_index: z.boolean().default(true),
  robots_follow: z.boolean().default(true),
  cta_id: z.string().uuid().optional().nullable(),
  cta_hidden: z.boolean().default(false),
});

export const upsertEditorialPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const slug = (data.slug || slugify(data.title)).trim();
    const sanitizedContent = sanitizeHtml(data.html_content);
    let htmlContent = sanitizedContent;

    // Safety net: never let a transient empty editor state erase an existing article.
    if (data.id && isMeaningfullyEmptyHtml(sanitizedContent)) {
      const { data: existing, error: existingError } = await context.supabase
        .from("editorial_pages")
        .select("html_content")
        .eq("id", data.id)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing?.html_content && !isMeaningfullyEmptyHtml(existing.html_content)) {
        htmlContent = existing.html_content;
      }
    }

    const payload: Record<string, unknown> = {
      ...data,
      slug,
      html_content: htmlContent,
      featured_image: data.featured_image || null,
      author_id: context.userId,
      published_at: data.status === "published" ? new Date().toISOString() : null,
    };
    if (!data.id) delete payload.id;
    const { data: row, error } = await context.supabase
      .from("editorial_pages")
      .upsert(payload as never, { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const { logCmsAction, seoSnapshot } = await import("./audit.server");
    await logCmsAction(context, {
      action: !data.id ? "page.create" : row?.status === "published" ? "page.publish" : "page.update",
      entity_type: "editorial_page",
      entity_id: row?.id ?? null,
      details: { title: data.title, slug, content_type: data.content_type, status: data.status, seo: seoSnapshot(data) },
    });
    if (row?.status === "published") {
      const base = row.content_type === "condominio" ? "/condominios"
        : row.content_type === "bairro" ? "/bairros"
        : row.content_type === "blog" ? "/blog" : null;
      if (base) {
        const { autoNotifyPublish } = await import("./seo.functions");
        autoNotifyPublish([`${base}/${row.slug}`]).catch(() => {});
      }
    }
    return row;
  });

export const deleteEditorialPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("editorial_pages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const { logCmsAction } = await import("./audit.server");
    await logCmsAction(context, { action: "page.delete", entity_type: "editorial_page", entity_id: data.id });
    return { ok: true };
  });

export const togglePublishEditorial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row } = await context.supabase
      .from("editorial_pages").select("status,slug,content_type").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Página não encontrada");
    const next = row.status === "published" ? "draft" : "published";
    const { error } = await context.supabase.from("editorial_pages").update({
      status: next,
      published_at: next === "published" ? new Date().toISOString() : null,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    const { logCmsAction } = await import("./audit.server");
    await logCmsAction(context, {
      action: next === "published" ? "page.publish" : "page.unpublish",
      entity_type: "editorial_page",
      entity_id: data.id,
      details: { slug: row.slug, content_type: row.content_type },
    });
    if (next === "published") {
      const base = row.content_type === "condominio" ? "/condominios"
        : row.content_type === "bairro" ? "/bairros"
        : row.content_type === "blog" ? "/blog" : null;
      if (base) {
        const { autoNotifyPublish } = await import("./seo.functions");
        autoNotifyPublish([`${base}/${row.slug}`]).catch(() => {});
      }
    }
    return { status: next };
  });


export const duplicateEditorialPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("editorial_pages").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Página não encontrada");
    const { id, created_at, updated_at, published_at, ...rest } = row;
    const baseSlug = `${row.slug}-copia`;
    let slug = baseSlug;
    let i = 2;
    while (true) {
      const { data: existing } = await context.supabase
        .from("editorial_pages").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${i++}`;
    }
    const { data: created, error: err2 } = await context.supabase
      .from("editorial_pages").insert({
        ...rest,
        slug,
        title: `${row.title} (cópia)`,
        status: "draft",
        published_at: null,
        author_id: context.userId,
      }).select().single();
    if (err2) throw new Error(err2.message);
    return created;
  });

export const listPublishedSlugsForSitemap = createServerFn({ method: "GET" })
  .handler(async () => {
    const sb = publicClient();
    const { data, error } = await sb.from("editorial_pages")
      .select("slug,content_type,updated_at").eq("status", "published");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Selects for related neighborhood/condominium ----------

export const listBairroOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("editorial_pages")
      .select("slug,title,content_type")
      .in("content_type", ["bairro", "guia"])
      .order("title", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      slug: r.slug,
      title: r.content_type === "guia" ? `${r.title} (guia)` : r.title,
    })) as { slug: string; title: string }[];
  });

export const listCondominioOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    // IMPORTANT: related_condominium tem FK para condominiums.id.
    // NÃO misturar com editorial_pages.id — quebra a constraint ao salvar.
    const { data, error } = await context.supabase
      .from("condominiums")
      .select("id,name,region")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: string; name: string; region: string | null }[];
  });


// ---------- AI SEO generation ----------

const seoInput = z.object({
  title: z.string().min(2),
  excerpt: z.string().optional().nullable(),
  html_content: z.string().optional().nullable(),
  content_type: z.enum(CONTENT_TYPES),
  related_neighborhood: z.string().optional().nullable(),
});

export const generateSeoMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => seoInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const plain = (data.html_content || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000);

    const contextLine = data.related_neighborhood
      ? `Bairro/região: ${data.related_neighborhood}.`
      : "Foco regional: Alphaville, Tamboré, Barueri e Santana de Parnaíba (SP).";

    const sys = `Você é especialista em SEO local imobiliário de alto padrão em Alphaville (SP).
Gere metadados SEO em português do Brasil, naturais, persuasivos e otimizados para busca local.
Responda APENAS com um objeto JSON válido nas chaves: meta_title, meta_description, focus_keyword, secondary_keywords.
- meta_title: máximo 60 caracteres, com palavra-chave principal e localidade quando fizer sentido.
- meta_description: 140 a 160 caracteres, com chamada para ação suave.
- focus_keyword: 1 frase curta (2 a 5 palavras), a principal.
- secondary_keywords: array de 5 a 8 palavras-chave de cauda longa relevantes.`;

    const user = `Tipo de página: ${data.content_type}. ${contextLine}
Título: ${data.title}
Resumo: ${data.excerpt ?? "(sem resumo)"}
Trecho do conteúdo:
${plain || "(vazio)"}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      if (resp.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
      if (resp.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      throw new Error(`Falha na geração de SEO (${resp.status}): ${text.slice(0, 200)}`);
    }

    const json = await resp.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const meta_title = String(parsed.meta_title ?? "").slice(0, 70);
    const meta_description = String(parsed.meta_description ?? "").slice(0, 180);
    const focus_keyword = String(parsed.focus_keyword ?? "").slice(0, 100);
    let secondary_keywords: string[] = [];
    if (Array.isArray(parsed.secondary_keywords)) {
      secondary_keywords = parsed.secondary_keywords.map((k: unknown) => String(k)).filter(Boolean).slice(0, 10);
    } else if (typeof parsed.secondary_keywords === "string") {
      secondary_keywords = parsed.secondary_keywords.split(",").map((s: string) => s.trim()).filter(Boolean);
    }

    return { meta_title, meta_description, focus_keyword, secondary_keywords };
  });

// ---------- Search for internal links (used by editor link dialog) ----------

const STATIC_ROUTES = [
  { title: "Página inicial", url: "/", kind: "site" },
  { title: "Imóveis", url: "/imoveis", kind: "site" },
  { title: "Condomínios", url: "/condominios", kind: "site" },
  { title: "Bairros", url: "/bairros", kind: "site" },
  { title: "Blog", url: "/blog", kind: "site" },
  { title: "Guia local", url: "/guia", kind: "site" },
  { title: "Guia de ruas", url: "/ruas", kind: "site" },
  { title: "Contato", url: "/contato", kind: "site" },
  { title: "Quem somos", url: "/quem-somos", kind: "site" },
];

export const searchInternalLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().default("") }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const q = data.q.trim().toLowerCase();

    const staticMatches = STATIC_ROUTES
      .filter((r) => !q || r.title.toLowerCase().includes(q))
      .slice(0, 8);

    const [pages, props, condos] = await Promise.all([
      context.supabase
        .from("editorial_pages")
        .select("slug,title,content_type")
        .eq("status", "published")
        .ilike("title", `%${q}%`)
        .limit(10),
      context.supabase
        .from("properties")
        .select("slug,title")
        .eq("status", "active")
        .ilike("title", `%${q}%`)
        .limit(8),
      context.supabase
        .from("condominiums")
        .select("id,name")
        .ilike("name", `%${q}%`)
        .limit(8),
    ]);

    const pageResults = (pages.data ?? []).map((p: any) => {
      const base = p.content_type === "condominio" ? "/condominios"
        : p.content_type === "bairro" ? "/bairros"
        : p.content_type === "blog" ? "/blog"
        : p.content_type === "guia" ? "/guia"
        : p.content_type === "empreendimento" ? "/empreendimentos"
        : p.content_type === "parceiro" ? "/parceiros"
        : null;
      return {
        title: p.title,
        url: base ? `${base}/${p.slug}` : `/artigos/${p.slug}`,
        kind: p.content_type,
      };
    });

    const propertyResults = (props.data ?? []).map((p: any) => ({
      title: p.title, url: `/imoveis/${p.slug}`, kind: "imóvel",
    }));

    const condoResults = (condos.data ?? []).map((c: any) => ({
      title: c.name, url: `/condominios/${c.id}`, kind: "condomínio",
    }));

    return [...staticMatches, ...pageResults, ...propertyResults, ...condoResults];
  });
