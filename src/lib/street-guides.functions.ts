import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const STREET_VIA_TYPES = ["alameda", "avenida", "rua", "regiao", "calcada", "centro"] as const;
export const STREET_STATUSES = ["draft", "published", "hidden"] as const;

const PROFILE_TAG_OPTIONS = [
  "residencial",
  "comercial",
  "corporativa",
  "mista",
  "proxima-a-condominios",
  "proxima-a-escolas",
  "proxima-a-servicos",
  "proxima-a-acessos-principais",
  "alto-padrao",
] as const;

const nearbyPointSchema = z.object({
  label: z.string().min(1),
  kind: z.enum([
    "condominio",
    "centro-comercial",
    "escola",
    "supermercado",
    "shopping",
    "hospital",
    "restaurante",
    "academia",
    "praca",
    "acesso-viario",
    "polo-empresarial",
    "outro",
  ]).default("outro"),
  distance: z.string().optional().nullable(),
  url: z.string().url().optional().nullable(),
});

const faqItemSchema = z.object({
  question: z.string().min(3),
  answer: z.string().min(3),
});

const sourceItemSchema = z.object({
  label: z.string().min(1),
  url: z.string().url().optional().nullable(),
});

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

export type StreetGuideListItem = {
  id: string;
  slug: string;
  name: string;
  via_type: (typeof STREET_VIA_TYPES)[number];
  city: string | null;
  region: string | null;
  neighborhood: string | null;
  short_description: string | null;
  og_image: string | null;
  hub_section: string | null;
  display_order: number;
  seo_priority: number;
  updated_at: string;
  published_at: string | null;
};

// ---------- PUBLIC ----------

export const listPublishedStreetGuides = createServerFn({ method: "GET" })
  .handler(async () => {
    const sb = publicClient();
    const { data, error } = await sb.from("street_guides")
      .select("id,slug,name,via_type,city,region,neighborhood,short_description,og_image,hub_section,display_order,seo_priority,updated_at,published_at")
      .eq("status", "published")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as StreetGuideListItem[];
  });

export const getStreetGuideBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("street_guides")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

/**
 * Cascata para "imóveis próximos":
 *  1. related_property_ids manuais
 *  2. imóveis cujo endereço/bairro/condomínio bata com nome da rua / condo relacionado
 *  3. imóveis do mesmo bairro/região
 * Nunca retorna vazio — se não houver nada, callers exibem CTA institucional.
 */
export const findPropertiesNearStreet = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({
    slug: z.string().min(1),
    limit: z.number().int().positive().max(24).default(9),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: guide } = await sb.from("street_guides")
      .select("id,name,city,region,neighborhood,related_condo_ids,related_property_ids,related_regions")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!guide) return { tier: "empty" as const, items: [] as any[] };

    const cols = "id,slug,title,property_type,neighborhood,city,region,price_sale,price_rent,bedrooms,suites,parking,area_useful,area_built,area_total,images,internal_code,purpose,condominium_id";
    const sanitize = (rows: any[]) => rows.map((p) => ({
      ...p,
      area: p.area_useful ?? p.area_built ?? p.area_total ?? null,
      images: Array.isArray(p.images)
        ? (p.images as unknown[])
            .filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u) && !/(logo|favicon|whats|placeholder)/i.test(u))
        : [],
    }));

    // Tier 1: relacionamento manual
    if (guide.related_property_ids?.length) {
      const { data: rows } = await sb.from("properties").select(cols)
        .in("id", guide.related_property_ids as string[])
        .eq("status", "active")
        .limit(data.limit);
      if (rows?.length) return { tier: "manual" as const, items: sanitize(rows) };
    }

    // Tier 2: bater por endereço / condomínio relacionado
    const nameLike = `%${guide.name}%`;
    let q2 = sb.from("properties").select(cols).eq("status", "active").limit(data.limit);
    const orParts: string[] = [`address.ilike.${nameLike}`, `title.ilike.${nameLike}`];
    if (guide.related_condo_ids?.length) {
      const ids = (guide.related_condo_ids as string[]).map((id) => `"${id}"`).join(",");
      orParts.push(`condominium_id.in.(${ids})`);
    }
    q2 = q2.or(orParts.join(","));
    const { data: rows2 } = await q2;
    if (rows2?.length) return { tier: "nearby" as const, items: sanitize(rows2) };

    // Tier 3: mesma região/bairro/cidade
    let q3 = sb.from("properties").select(cols).eq("status", "active").limit(data.limit);
    if (guide.neighborhood) q3 = q3.eq("neighborhood", guide.neighborhood);
    else if (guide.region) q3 = q3.eq("region", guide.region);
    else if (guide.city) q3 = q3.eq("city", guide.city);
    else return { tier: "empty" as const, items: [] };
    const { data: rows3 } = await q3;
    if (rows3?.length) return { tier: "region" as const, items: sanitize(rows3) };

    return { tier: "empty" as const, items: [] };
  });

// ---------- ADMIN ----------

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId, _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const listStreetGuidesForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    status: z.enum(STREET_STATUSES).optional(),
    search: z.string().optional(),
    city: z.string().optional(),
    viaType: z.enum(STREET_VIA_TYPES).optional(),
  }).default({}).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase.from("street_guides")
      .select("id,slug,name,via_type,city,region,neighborhood,status,seo_title,meta_description,short_description,long_description,h1,related_condo_ids,related_property_ids,related_street_ids,related_regions,display_order,seo_priority,updated_at,published_at")
      .order("display_order", { ascending: true })
      .order("updated_at", { ascending: false });
    if (data.status) q = q.eq("status", data.status);
    if (data.city) q = q.eq("city", data.city);
    if (data.viaType) q = q.eq("via_type", data.viaType);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getStreetGuideByIdAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("street_guides").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().optional(),
  name: z.string().min(2),
  via_type: z.enum(STREET_VIA_TYPES).default("rua"),
  city: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  hub_section: z.string().optional().nullable(),

  short_description: z.string().optional().nullable(),
  long_description: z.string().optional().nullable(),
  intro_text: z.string().optional().nullable(),
  profile_tags: z.array(z.enum(PROFILE_TAG_OPTIONS)).default([]),
  nearby_points: z.array(nearbyPointSchema).default([]),
  faq: z.array(faqItemSchema).default([]),
  sources: z.array(sourceItemSchema).default([]),

  seo_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  h1: z.string().optional().nullable(),
  og_image: z.string().optional().nullable(),
  canonical_override: z.string().optional().nullable(),
  seo_priority: z.number().int().min(0).max(100).default(50),
  display_order: z.number().int().default(100),

  related_condo_ids: z.array(z.string().uuid()).default([]),
  related_property_ids: z.array(z.string().uuid()).default([]),
  related_street_ids: z.array(z.string().uuid()).default([]),
  related_regions: z.array(z.string()).default([]),

  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  search_radius_km: z.number().optional().nullable(),

  status: z.enum(STREET_STATUSES).default("draft"),
});

export const upsertStreetGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const slug = (data.slug || slugify(data.name)).trim();
    const payload: Record<string, unknown> = {
      ...data,
      slug,
      created_by: context.userId,
    };
    if (!data.id) delete payload.id;
    const { data: row, error } = await context.supabase
      .from("street_guides")
      .upsert(payload as never, { onConflict: "id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (row?.status === "published") {
      const { autoNotifyPublish } = await import("./seo.functions");
      autoNotifyPublish([`/guia-de-ruas-alphaville/${row.slug}`]).catch(() => {});
    }
    return row;
  });

export const deleteStreetGuide = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("street_guides").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleStreetGuideStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(STREET_STATUSES),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "published") patch.published_at = new Date().toISOString();
    const { data: row, error } = await context.supabase
      .from("street_guides").update(patch).eq("id", data.id).select("slug,status").single();
    if (error) throw new Error(error.message);
    if (row?.status === "published") {
      const { autoNotifyPublish } = await import("./seo.functions");
      autoNotifyPublish([`/guia-de-ruas-alphaville/${row.slug}`]).catch(() => {});
    }
    return { status: row?.status };
  });

// Sitemap helper
export const listPublishedStreetGuideSlugsForSitemap = createServerFn({ method: "GET" })
  .handler(async () => {
    const sb = publicClient();
    const { data, error } = await sb.from("street_guides")
      .select("slug,updated_at").eq("status", "published");
    if (error) throw new Error(error.message);
    return data ?? [];
  });
