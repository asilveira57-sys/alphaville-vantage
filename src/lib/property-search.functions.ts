import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { toRpcArgs, type ImoveisSearch } from "./property-query";
import { cityOrder } from "./cities";

export const PAGE_SIZE = 15;

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const searchInput = z.object({
  purpose: z.string().max(10), type: z.string().max(60), city: z.string().max(80),
  neighborhood: z.string().max(120), condo: z.string().max(160),
  bedrooms: z.number().int().min(0).max(20), parking: z.number().int().min(0).max(20),
  priceMin: z.number().min(0), priceMax: z.number().min(0), areaMin: z.number().min(0),
  sort: z.string().max(20), q: z.string().max(200), page: z.number().int().min(1).max(1000),
  limit: z.number().int().min(1).max(60).optional(),
});

export type SearchCard = {
  id: string; slug: string; title: string; internal_code: string | null; purpose: string | null;
  property_type: string | null; city: string | null; neighborhood: string | null; region: string | null;
  condo_name: string | null; bedrooms: number | null; suites: number | null; parking_total: number | null;
  area: number | null; area_useful: number | null; area_built: number | null; area_total: number | null;
  price_sale: number | null; price_rent: number | null; image: string | null; card_image_url: string | null;
};

export const searchProperties = createServerFn({ method: "GET" })
  .inputValidator((d: ImoveisSearch & { limit?: number }) => searchInput.parse(d))
  .handler(async ({ data }) => {
    const limit = data.limit ?? PAGE_SIZE;
    const { data: rows, error } = await publicClient().rpc(
      "search_properties",
      toRpcArgs(data, limit, (data.page - 1) * limit) as never,
    );
    if (error) {
      console.error("search_properties", error);
      throw new Error("Não foi possível carregar os imóveis.");
    }
    const list = (rows ?? []) as unknown as (SearchCard & { total: number })[];
    const total = list.length ? Number(list[0].total) : 0;
    return { items: list.map(({ total: _t, ...r }) => r) as SearchCard[], total };
  });

export type Facets = {
  types: string[]; cities: string[]; neighborhoods: string[]; condos: string[];
  cityCounts: Record<string, number>; neighborhoodCounts: Record<string, number>; condoCounts: Record<string, number>;
  priceMax: number; isRent: boolean; total: number;
};

let facetCache: { at: number; value: Facets } | null = null;

export const getSearchFacets = createServerFn({ method: "GET" }).handler(async (): Promise<Facets> => {
  setResponseHeader("Cache-Control", "public, max-age=300");
  if (facetCache && Date.now() - facetCache.at < 300_000) return facetCache.value;
  const { data, error } = await publicClient().rpc("property_search_facets");
  if (error) {
    console.error("property_search_facets", error);
    throw new Error("Não foi possível carregar os filtros.");
  }
  const f = data as unknown as Omit<Facets, "cities" | "neighborhoods" | "condos">;
  const sortPt = (a: string, b: string) => a.localeCompare(b, "pt-BR");
  const value: Facets = {
    ...f,
    types: [...f.types].sort(sortPt),
    cities: Object.keys(f.cityCounts).sort(cityOrder),
    neighborhoods: Object.keys(f.neighborhoodCounts).sort(sortPt),
    condos: Object.keys(f.condoCounts).sort(sortPt),
    priceMax: Number(f.priceMax) || 0,
    isRent: !!f.isRent,
    total: Number(f.total) || 0,
  };
  facetCache = { at: Date.now(), value };
  return value;
});
