import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fetchAllRows } from "./fetch-all";

/**
 * Páginas vivas de imóveis: cada página é um conjunto de filtros sobre os imóveis ativos.
 * Lista, contagem e números (mediana, m², por condomínio) são calculados a cada visita,
 * então a página nunca fica desatualizada quando um imóvel sai ou entra.
 */

export type ListingFilters = {
  types?: string[];
  cities?: string[];
  bedrooms?: number;
  bedrooms_min?: number;
  price_min?: number;
  price_max?: number;
  furnished?: boolean;
  condominium_ids?: string[];
};

export type ListingItem = {
  id: string; slug: string; title: string; image: string | null; card: string | null;
  purpose: string | null; property_type: string | null; city: string | null; neighborhood: string | null;
  condominium_name: string | null; internal_code: string | null; bedrooms: number | null; parking: number | null;
  area: number | null; price_sale: number | null; price_rent: number | null;
};

export type ListingStats = {
  count: number; min: number | null; max: number | null; median: number | null;
  medianM2: number | null; medianArea: number | null; medianCondoFee: number | null;
  newLast30: number; byCondo: { name: string; count: number }[];
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

const SELECT =
  "id,slug,title,images,card_image_url,purpose,property_type,city,neighborhood,condominium_name,internal_code,bedrooms,parking,parking_covered,parking_uncovered,area_useful,area_built,area_total,price_sale,price_rent,condo_fee,furnished,created_at";

type Row = Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === "number" ? v : typeof v === "string" && v !== "" && !isNaN(Number(v)) ? Number(v) : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m]! : (v[m - 1]! + v[m]!) / 2;
}

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const f = images[0];
  if (typeof f === "string") return f;
  if (f && typeof f === "object" && typeof (f as { url?: string }).url === "string") return (f as { url: string }).url;
  return null;
}

function toItem(r: Row): ListingItem {
  const parking = num(r["parking"]) ?? (((num(r["parking_covered"]) ?? 0) + (num(r["parking_uncovered"]) ?? 0)) || null);
  return {
    id: String(r["id"]), slug: String(r["slug"] ?? ""), title: String(r["title"] ?? ""),
    image: firstImage(r["images"]), card: str(r["card_image_url"]),
    purpose: str(r["purpose"]), property_type: str(r["property_type"]), city: str(r["city"]),
    neighborhood: str(r["neighborhood"]), condominium_name: str(r["condominium_name"]),
    internal_code: str(r["internal_code"]), bedrooms: num(r["bedrooms"]), parking,
    area: num(r["area_useful"]) ?? num(r["area_built"]) ?? num(r["area_total"]),
    price_sale: num(r["price_sale"]), price_rent: num(r["price_rent"]),
  };
}

export const getListingPage = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: page, error } = await sb.from("listing_pages").select("*").eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (error) throw new Error(error.message);
    if (!page) return null;

    const f = (page.filters ?? {}) as ListingFilters;
    const rent = page.purpose === "rent";
    const priceCol = rent ? "price_rent" : "price_sale";

    const rows = await fetchAllRows<Row>((from, to) => {
      let q = sb.from("properties").select(SELECT).eq("status", "active")
        .in("purpose", rent ? ["rent", "both"] : ["sale", "both"]).gt(priceCol, 0);
      if (f.types?.length) q = q.in("property_type", f.types);
      if (f.cities?.length) q = q.in("city", f.cities);
      if (typeof f.bedrooms === "number") q = q.eq("bedrooms", f.bedrooms);
      if (typeof f.bedrooms_min === "number") q = q.gte("bedrooms", f.bedrooms_min);
      if (typeof f.price_min === "number") q = q.gte(priceCol, f.price_min);
      if (typeof f.price_max === "number") q = q.lte(priceCol, f.price_max);
      if (f.furnished === true) q = q.eq("furnished", true);
      if (f.condominium_ids?.length) q = q.in("condominium_id", f.condominium_ids);
      return q.order(priceCol, { ascending: true }).order("id", { ascending: true }).range(from, to);
    });

    const items = rows.map(toItem).filter((p) => p.slug && p.title);
    const prices = items.map((p) => (rent ? p.price_rent : p.price_sale) ?? NaN);
    const m2 = items
      .filter((p) => p.area && p.area >= 25 && p.area <= 5000 && p.price_sale)
      .map((p) => (p.price_sale as number) / (p.area as number))
      .filter((v) => v >= 2000 && v <= 80000);
    const condoFees = rows.map((r) => num(r["condo_fee"])).filter((v): v is number => v !== null && v >= 100 && v <= 30000);
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    const byCondoMap = new Map<string, number>();
    for (const p of items) {
      const n = p.condominium_name?.trim();
      if (n) byCondoMap.set(n, (byCondoMap.get(n) ?? 0) + 1);
    }
    const stats: ListingStats = {
      count: items.length,
      min: items.length ? Math.min(...prices) : null,
      max: items.length ? Math.max(...prices) : null,
      median: median(prices),
      medianM2: rent ? null : median(m2),
      medianArea: median(items.map((p) => p.area ?? NaN).filter((a) => a >= 20 && a <= 5000)),
      medianCondoFee: median(condoFees),
      newLast30: rows.filter((r) => { const t = Date.parse(String(r["created_at"] ?? "")); return !isNaN(t) && t >= cutoff; }).length,
      byCondo: [...byCondoMap.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    };

    let related: { slug: string; title: string }[] = [];
    if (Array.isArray(page.related_slugs) && page.related_slugs.length) {
      const { data: rel } = await sb.from("listing_pages").select("slug,title").eq("status", "published").in("slug", page.related_slugs);
      related = (rel ?? []) as { slug: string; title: string }[];
    }

    return {
      page: page as {
        slug: string; title: string; h1: string | null; meta_description: string | null; intro_html: string | null;
        purpose: "sale" | "rent"; min_items: number; faq: { question: string; answer: string }[]; updated_at: string;
      },
      stats,
      items: items.slice(0, 60),
      related,
      generatedAt: new Date().toISOString(),
    };
  });
