import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logCmsAction } from "@/lib/audit.server";

/** Ficha do condomínio usada na página /condominios/$slug (mapa, fotos, lazer, distâncias, FAQ). */
export type CondoNearby = { cat: string; name: string; km: number; min?: number | null };
export type CondoPhoto = { url: string; alt?: string | null };
export type CondoFaq = { question: string; answer: string };
export type CondoDetailsDTO = {
  id: string;
  name: string;
  official_name: string | null;
  address: string | null;
  postal_code: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;
  developer: string | null;
  year_built: number | null;
  towers: number | null;
  floors: number | null;
  units_count: number | null;
  amenities: string[];
  gallery: CondoPhoto[];
  nearby: CondoNearby[];
  faq: CondoFaq[];
  parent: string | null;
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export const getCondoDetails = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data }): Promise<CondoDetailsDTO | null> => {
    if (!data.id) return null;
    const { data: r, error } = await publicClient()
      .from("condominiums")
      .select("id,name,official_name,address,postal_code,region,lat,lng,developer,year_built,towers,floors,units_count,amenities,gallery,nearby,faq")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !r) return null;
    const row = r as Record<string, unknown>;
    const { data: mp } = await publicClient().from("condo_map_points").select("parent").eq("condominium_id", data.id).maybeSingle();
    return {
      id: String(row.id),
      name: String(row.name ?? ""),
      official_name: (row.official_name as string | null) ?? null,
      address: (row.address as string | null) ?? null,
      postal_code: (row.postal_code as string | null) ?? null,
      region: (row.region as string | null) ?? null,
      lat: (row.lat as number | null) ?? null,
      lng: (row.lng as number | null) ?? null,
      developer: (row.developer as string | null) ?? null,
      year_built: (row.year_built as number | null) ?? null,
      towers: (row.towers as number | null) ?? null,
      floors: (row.floors as number | null) ?? null,
      units_count: (row.units_count as number | null) ?? null,
      amenities: arr<string>(row.amenities).filter(Boolean),
      gallery: arr<CondoPhoto>(row.gallery).filter((p) => p && typeof p.url === "string"),
      nearby: arr<CondoNearby>(row.nearby).filter((n) => n && n.name && typeof n.km === "number"),
      faq: arr<CondoFaq>(row.faq).filter((f) => f && f.question && f.answer),
      parent: ((mp as { parent?: string | null } | null)?.parent) ?? null,
    };
  });

/* ------------------------------------------------------------------ */
/* Admin: tela /admin-condominios-ficha                                */
/* ------------------------------------------------------------------ */

export type CondoAdminRow = {
  id: string; name: string; slug: string; status: string; active: number;
  hasFacts: boolean; amenities: number; photos: number; nearby: number; faq: number; lat: number | null; lng: number | null;
};

/** Lista de condomínios com imóveis ativos e o quanto da ficha está preenchido. */
export const listCondoDetailsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CondoAdminRow[]> => {
    const sb = context.supabase as any;
    const counts = new Map<string, number>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from("properties").select("condominium_id").eq("status", "active").not("condominium_id", "is", null).range(from, from + 999);
      if (error) throw new Error(error.message);
      (data ?? []).forEach((r: { condominium_id: string }) => counts.set(r.condominium_id, (counts.get(r.condominium_id) ?? 0) + 1));
      if (!data || data.length < 1000) break;
    }
    const { data: condos, error } = await sb.from("condominiums")
      .select("id,name,slug,status,official_name,developer,towers,year_built,amenities,gallery,nearby,faq,lat,lng");
    if (error) throw new Error(error.message);
    return (condos ?? [])
      .map((c: Record<string, any>) => ({
        id: c.id, name: c.name, slug: c.slug, status: c.status, active: counts.get(c.id) ?? 0,
        hasFacts: Boolean(c.official_name || c.developer || c.towers || c.year_built),
        amenities: arr(c.amenities).length, photos: arr(c.gallery).length, nearby: arr(c.nearby).length, faq: arr(c.faq).length,
        lat: c.lat ?? null, lng: c.lng ?? null,
      }))
      .filter((c: CondoAdminRow) => c.active > 0)
      .sort((a: CondoAdminRow, b: CondoAdminRow) => b.active - a.active);
  });

const detailsSchema = z.object({
  id: z.string().uuid(),
  official_name: z.string().trim().max(160).nullable(),
  address: z.string().trim().max(200).nullable(),
  postal_code: z.string().trim().max(12).nullable(),
  developer: z.string().trim().max(160).nullable(),
  year_built: z.number().int().min(1950).max(2040).nullable(),
  towers: z.number().int().min(0).max(200).nullable(),
  floors: z.number().int().min(0).max(200).nullable(),
  units_count: z.number().int().min(0).max(20000).nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  amenities: z.array(z.string().trim().min(1).max(120)).max(80),
  gallery: z.array(z.object({ url: z.string().min(1).max(1000), alt: z.string().max(200).nullable().optional() })).max(60),
  faq: z.array(z.object({ question: z.string().trim().min(3).max(300), answer: z.string().trim().min(3).max(3000) })).max(30),
  details_sources: z.string().max(2000).nullable(),
});

export const getCondoDetailsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: c, error } = await sb.from("condominiums")
      .select("id,name,slug,status,official_name,address,postal_code,developer,year_built,towers,floors,units_count,lat,lng,amenities,gallery,nearby,faq,details_sources")
      .eq("id", data.id).maybeSingle();
    if (error || !c) throw new Error(error?.message ?? "Condomínio não encontrado");
    const { data: props } = await sb.from("properties").select("internal_code,images,status").eq("condominium_id", data.id).eq("status", "active").limit(60);
    const photos: Array<{ code: string; url: string }> = [];
    (props ?? []).forEach((p: { internal_code: string; images: unknown }) =>
      arr<unknown>(p.images).forEach((u) => {
        const url = typeof u === "string" ? u : (u as { url?: string })?.url;
        if (url) photos.push({ code: p.internal_code, url });
      }));
    return { condo: c as Record<string, any>, listingPhotos: photos };
  });

export const saveCondoDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => detailsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { id, ...patch } = data;
    const { error } = await sb.from("condominiums").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
    await logCmsAction(context as never, { action: "update_details", entity_type: "condominium", entity_id: id, details: { amenities: patch.amenities.length, photos: patch.gallery.length, faq: patch.faq.length } });
    return { ok: true as const };
  });

export const saveCondoNearby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    nearby: z.array(z.object({ cat: z.string(), name: z.string(), km: z.number(), min: z.number().nullable().optional() })).max(40),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("condominiums").update({ nearby: data.nearby }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
