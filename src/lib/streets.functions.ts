import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const STREET_TYPES = [
  "rua",
  "avenida",
  "alameda",
  "rodovia",
  "estrada",
  "praca",
  "travessa",
  "via",
] as const;

export const STREET_STATUSES = ["draft", "published", "archived"] as const;

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

export type StreetListItem = {
  id: string;
  slug: string;
  name: string;
  official_name: string | null;
  street_type: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  short_description: string | null;
  hero_image: string | null;
  featured: boolean;
  updated_at: string;
  published_at: string | null;
};

// ---------- PUBLIC ----------

export const listPublishedStreets = createServerFn({ method: "GET" })
  .handler(async () => {
    const sb = publicClient();
    const { data, error } = await sb.from("streets")
      .select("id,slug,name,official_name,street_type,neighborhood,city,state,short_description,hero_image,featured,updated_at,published_at")
      .eq("status", "published")
      .eq("active", true)
      .order("featured", { ascending: false })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as StreetListItem[];
  });

export const getStreetBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb.from("streets")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .eq("active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/**
 * Cascata para imóveis da rua:
 *  1. property_streets vinculados (match automático ou manual)
 *  2. Se rua tem neighborhood → imóveis do mesmo bairro
 *  3. Se rua tem city → imóveis da mesma cidade
 */
export const findPropertiesOnStreet = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({
    slug: z.string().min(1),
    limit: z.number().int().positive().max(48).default(12),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: street } = await sb.from("streets")
      .select("id,name,neighborhood,city")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!street) return { tier: "empty" as const, items: [] as any[] };

    const cols = "id,slug,title,property_type,neighborhood,city,region,price_sale,price_rent,bedrooms,suites,parking,area_useful,area_built,area_total,images,internal_code,purpose,condominium_id,address,street_id";

    const sanitize = (rows: any[]) => rows.map((p) => ({
      ...p,
      area: p.area_useful ?? p.area_built ?? p.area_total ?? null,
      images: Array.isArray(p.images)
        ? (p.images as unknown[])
            .filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u) && !/(logo|favicon|whats|placeholder)/i.test(u))
        : [],
    }));

    // Tier 1: property_streets vinculados
    const { data: links } = await sb.from("property_streets")
      .select("property_id")
      .eq("street_id", street.id)
      .order("match_confidence", { ascending: false })
      .limit(data.limit);
    const ids = (links ?? []).map((l: any) => l.property_id);
    if (ids.length) {
      const { data: rows } = await sb.from("properties").select(cols)
        .in("id", ids).eq("status", "active").limit(data.limit);
      if (rows?.length) return { tier: "linked" as const, items: sanitize(rows) };
    }

    // Tier 2: mesmo bairro
    if (street.neighborhood) {
      const { data: rows } = await sb.from("properties").select(cols)
        .eq("neighborhood", street.neighborhood).eq("status", "active").limit(data.limit);
      if (rows?.length) return { tier: "neighborhood" as const, items: sanitize(rows) };
    }

    // Tier 3: mesma cidade
    if (street.city) {
      const { data: rows } = await sb.from("properties").select(cols)
        .eq("city", street.city).eq("status", "active").limit(data.limit);
      if (rows?.length) return { tier: "city" as const, items: sanitize(rows) };
    }

    return { tier: "empty" as const, items: [] };
  });

export const listNearbyStreets = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({
    slug: z.string().min(1),
    limit: z.number().int().positive().max(12).default(6),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: street } = await sb.from("streets")
      .select("id,neighborhood,city")
      .eq("slug", data.slug).maybeSingle();
    if (!street) return [];
    let q = sb.from("streets")
      .select("id,slug,name,street_type,neighborhood,city,hero_image,short_description")
      .eq("status", "published").eq("active", true).neq("id", street.id).limit(data.limit);
    if (street.neighborhood) q = q.eq("neighborhood", street.neighborhood);
    else if (street.city) q = q.eq("city", street.city);
    const { data: rows } = await q;
    return rows ?? [];
  });

// ---------- ADMIN ----------

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId, _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const listStreetsForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    status: z.enum(STREET_STATUSES).optional(),
    search: z.string().optional(),
    city: z.string().optional(),
  }).default({}).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase.from("streets")
      .select("id,slug,name,street_type,neighborhood,city,status,featured,active,updated_at,published_at")
      .order("updated_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    if (data.city) q = q.eq("city", data.city);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertStreet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid().optional(),
    slug: z.string().optional(),
    name: z.string().min(2),
    official_name: z.string().optional().nullable(),
    street_type: z.enum(STREET_TYPES).default("rua"),
    neighborhood: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postal_code_start: z.string().optional().nullable(),
    postal_code_end: z.string().optional().nullable(),
    short_description: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    hero_image: z.string().optional().nullable(),
    seo_title: z.string().optional().nullable(),
    seo_description: z.string().optional().nullable(),
    h1: z.string().optional().nullable(),
    featured: z.boolean().default(false),
    status: z.enum(STREET_STATUSES).default("draft"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const slug = (data.slug || slugify(data.name)).trim();
    const payload: Record<string, unknown> = { ...data, slug, created_by: context.userId };
    if (!data.id) delete payload.id;
    if (data.status === "published") payload.published_at = new Date().toISOString();
    const { data: row, error } = await context.supabase
      .from("streets").upsert(payload as any, { onConflict: "id" }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteStreet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("streets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Sitemap helper
export const listPublishedStreetSlugsForSitemap = createServerFn({ method: "GET" })
  .handler(async () => {
    const sb = publicClient();
    const { data, error } = await sb.from("streets")
      .select("slug,updated_at").eq("status", "published").eq("active", true);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
