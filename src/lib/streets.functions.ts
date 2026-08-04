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
    history: z.string().optional().nullable(),
    real_estate_profile: z.string().optional().nullable(),
    access_information: z.string().optional().nullable(),
    traffic_information: z.string().optional().nullable(),
    public_transport_information: z.string().optional().nullable(),
    parking_information: z.string().optional().nullable(),
    hero_image: z.string().optional().nullable(),
    hero_image_alt: z.string().optional().nullable(),
    gallery_images: z.array(z.object({
      url: z.string(),
      alt: z.string().optional().default(""),
      caption: z.string().optional().default(""),
    })).optional(),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
    seo_title: z.string().optional().nullable(),
    seo_description: z.string().optional().nullable(),
    seo_keywords: z.string().optional().nullable(),
    canonical_url: z.string().optional().nullable(),
    h1: z.string().optional().nullable(),
    og_title: z.string().optional().nullable(),
    og_description: z.string().optional().nullable(),
    social_image: z.string().optional().nullable(),
    robots_index: z.boolean().default(true),
    robots_follow: z.boolean().default(true),
    cta_id: z.string().uuid().optional().nullable(),
    cta_hidden: z.boolean().default(false),
    featured: z.boolean().default(false),
    active: z.boolean().default(true),
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
    const { logCmsAction, seoSnapshot } = await import("./audit.server");
    await logCmsAction(context, {
      action: data.id ? (data.status === "published" ? "street.publish" : "street.update") : "street.create",
      entity_type: "street",
      entity_id: row.id,
      details: { name: data.name, slug, status: data.status, seo: seoSnapshot(data) },
    });
    return row;
  });

export const deleteStreet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("streets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const { logCmsAction } = await import("./audit.server");
    await logCmsAction(context, { action: "street.delete", entity_type: "street", entity_id: data.id });
    return { ok: true };
  });


// ---------- REPORTS (admin) ----------

export type StreetsReport = {
  totals: { total: number; draft: number; published: number; archived: number; featured: number };
  properties: { linked: number; unlinked: number; total: number };
  topStreets: Array<{ id: string; name: string; slug: string; status: string; city: string | null; neighborhood: string | null; property_count: number }>;
  emptyPublished: Array<{ id: string; name: string; slug: string; city: string | null }>;
  unlinkedProperties: Array<{ id: string; slug: string | null; title: string | null; address: string | null; neighborhood: string | null; city: string | null }>;
  matchConfidence: { high: number; medium: number; low: number };
};

export const getStreetsReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StreetsReport> => {
    await assertAdmin(context);
    const sb = context.supabase;

    const [streets, propsAll, links] = await Promise.all([
      fetchAllRows<any>((f, t) => sb.from("streets").select("id,name,slug,status,featured,city,neighborhood").order("id").range(f, t)),
      fetchAllRows<any>((f, t) => sb.from("properties").select("id,slug,title,address,neighborhood,city,street_id,status").eq("status", "active").order("id").range(f, t)),
      fetchAllRows<any>((f, t) => sb.from("property_streets").select("street_id,property_id,match_confidence").order("street_id").range(f, t)),
    ]);

    const s = streets ?? [];
    const p = propsAll ?? [];
    const l = links ?? [];

    const totals = {
      total: s.length,
      draft: s.filter((x: any) => x.status === "draft").length,
      published: s.filter((x: any) => x.status === "published").length,
      archived: s.filter((x: any) => x.status === "archived").length,
      featured: s.filter((x: any) => x.featured).length,
    };

    const countsByStreet = new Map<string, number>();
    for (const link of l) countsByStreet.set(link.street_id, (countsByStreet.get(link.street_id) ?? 0) + 1);

    const topStreets = s
      .map((row: any) => ({ ...row, property_count: countsByStreet.get(row.id) ?? 0 }))
      .sort((a: any, b: any) => b.property_count - a.property_count)
      .slice(0, 15);

    const emptyPublished = s
      .filter((row: any) => row.status === "published" && (countsByStreet.get(row.id) ?? 0) === 0)
      .slice(0, 20)
      .map((row: any) => ({ id: row.id, name: row.name, slug: row.slug, city: row.city }));

    const linkedIds = new Set(l.map((x: any) => x.property_id));
    const unlinked = p.filter((row: any) => !row.street_id && !linkedIds.has(row.id));
    const unlinkedProperties = unlinked.slice(0, 30).map((row: any) => ({
      id: row.id, slug: row.slug, title: row.title, address: row.address, neighborhood: row.neighborhood, city: row.city,
    }));

    const matchConfidence = {
      high: l.filter((x: any) => (x.match_confidence ?? 0) >= 90).length,
      medium: l.filter((x: any) => (x.match_confidence ?? 0) >= 75 && (x.match_confidence ?? 0) < 90).length,
      low: l.filter((x: any) => (x.match_confidence ?? 0) < 75).length,
    };

    return {
      totals,
      properties: { linked: linkedIds.size, unlinked: unlinked.length, total: p.length },
      topStreets,
      emptyPublished,
      unlinkedProperties,
      matchConfidence,
    };
  });

// Rematch all properties (backfill)
export const rematchAllProperties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase.from("properties").select("id").eq("status", "active");
    if (error) throw new Error(error.message);
    let ok = 0, fail = 0;
    for (const r of rows ?? []) {
      const { error: e } = await context.supabase.rpc("match_property_streets", { p_property_id: r.id });
      if (e) fail++; else ok++;
    }
    return { processed: ok, failed: fail, total: (rows ?? []).length };
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
