import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

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
