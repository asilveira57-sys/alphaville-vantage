import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sanitizeHtml } from "./sanitize-html";

const CONTENT_TYPES = ["condominio", "bairro", "cidade", "guia", "blog", "institucional"] as const;
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
    let q = context.supabase.from("editorial_pages")
      .select("id,slug,title,content_type,status,is_featured,display_order,tags,meta_title,meta_description,updated_at,published_at,html_content")
      .order("updated_at", { ascending: false });
    if (data.contentType) q = q.eq("content_type", data.contentType);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.ilike("title", `%${data.search}%`);
    if (data.tag) q = q.contains("tags", [data.tag]);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
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

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2),
  slug: z.string().optional(),
  content_type: z.enum(CONTENT_TYPES),
  excerpt: z.string().optional().nullable(),
  html_content: z.string().default(""),
  featured_image: z.string().url().optional().nullable().or(z.literal("")),
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
});

export const upsertEditorialPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const slug = (data.slug || slugify(data.title)).trim();
    const payload: Record<string, unknown> = {
      ...data,
      slug,
      html_content: sanitizeHtml(data.html_content),
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
    return row;
  });

export const deleteEditorialPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("editorial_pages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePublishEditorial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row } = await context.supabase
      .from("editorial_pages").select("status").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Página não encontrada");
    const next = row.status === "published" ? "draft" : "published";
    const { error } = await context.supabase.from("editorial_pages").update({
      status: next,
      published_at: next === "published" ? new Date().toISOString() : null,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
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
