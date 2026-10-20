import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { publicClient } from "./property-search.functions";
import {
  listShowcase,
  HOME_SHOWCASE_SIZE,
  type OpportunityDTO,
} from "./opportunities.functions";

// Cache de 5 min no servidor: a home inteira (destaques, posts, contagens por
// região, imagens dos cards e vitrine) muda no máximo uma vez por dia, então
// não faz sentido refazer as consultas a cada visita.
const TTL = 300_000;
let homeCache: { at: number; value: HomeData } | null = null;

export type FeaturedProperty = {
  slug: string;
  title: string;
  internal_code: string | null;
  price_sale: number | null;
  price_rent: number | null;
  image: string | null;
  neighborhood: string | null;
  city: string | null;
  region: string | null;
  bedrooms: number | null;
  parking: number | null;
  area: number | null;
  property_type: string | null;
};

export type FeaturedPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image: string | null;
  tags: string[] | null;
};

export type RegionCounts = Record<string, number>;

export type HomeData = {
  properties: FeaturedProperty[];
  posts: FeaturedPost[];
  regionCounts: RegionCounts;
  regionImages: Record<string, string>;
  opportunities: OpportunityDTO[];
};

const isUsableImg = (u: string) =>
  /^https?:\/\//.test(u) && !/(logo|favicon|whats|placeholder|topo_contato)/i.test(u);

async function fetchFeatured(): Promise<FeaturedProperty[]> {
  const { data, error } = await publicClient()
    .from("properties")
    .select(
      "slug,title,internal_code,price_sale,price_rent,images,last_seen_at,neighborhood,city,region,bedrooms,parking,area_useful,area_total,property_type,card_image_url",
    )
    .eq("status", "active")
    .order("last_seen_at", { ascending: false })
    .limit(24);
  if (error) return [];
  const rows = (data ?? []).map((p) => {
    const imgs = Array.isArray(p.images) ? (p.images as string[]).filter(isUsableImg) : [];
    return {
      slug: p.slug,
      title: p.title,
      internal_code: p.internal_code,
      price_sale: p.price_sale,
      price_rent: p.price_rent,
      image: (p as { card_image_url?: string | null }).card_image_url ?? imgs[0] ?? null,
      neighborhood: p.neighborhood,
      city: p.city,
      region: p.region,
      bedrooms: p.bedrooms,
      parking: p.parking,
      area: p.area_useful ?? p.area_total ?? null,
      property_type: p.property_type,
    } as FeaturedProperty;
  });
  return rows.filter((p) => p.image).slice(0, 8);
}

async function fetchLatestPosts(): Promise<FeaturedPost[]> {
  const { data, error } = await publicClient()
    .from("editorial_pages")
    .select("id,slug,title,excerpt,featured_image,tags,published_at")
    .eq("status", "published")
    .eq("content_type", "blog")
    .order("published_at", { ascending: false })
    .limit(3);
  if (error) return [];
  return (data ?? []) as FeaturedPost[];
}

/** Uma única consulta agregada no banco (antes eram 4 consultas ilike por visita). */
async function fetchRegionCounts(): Promise<RegionCounts> {
  const { data, error } = await publicClient().rpc("home_region_counts" as never);
  if (error || !data) {
    if (error) console.error("home_region_counts", error);
    return {};
  }
  return data as unknown as RegionCounts;
}

/** Imagens dos cards de região vindas do CMS (Admin → Imagens dos cards). */
async function fetchRegionImages(): Promise<Record<string, string>> {
  const { data } = await publicClient()
    .from("editorial_pages")
    .select("slug,featured_image")
    .in("slug", ["guia-alphaville", "guia-tambore", "guia-barueri", "guia-santana-de-parnaiba"]);
  const map: Record<string, string> = {};
  for (const row of (data ?? []) as Array<{ slug: string; featured_image: string | null }>) {
    if (row.featured_image) map[row.slug] = row.featured_image;
  }
  return map;
}

async function loadHome(): Promise<HomeData> {
  const [properties, posts, regionCounts, regionImages, opportunities] = await Promise.all([
    fetchFeatured(),
    fetchLatestPosts(),
    fetchRegionCounts(),
    fetchRegionImages(),
    // A vitrine tem regra de negócio (curadoria, validade, sinais), então roda
    // no servidor — ao contrário das demais queries da home.
    listShowcase({ data: { limit: HOME_SHOWCASE_SIZE } }).catch(() => [] as OpportunityDTO[]),
  ]);
  return { properties, posts, regionCounts, regionImages, opportunities };
}

export const getHomeData = createServerFn({ method: "GET" }).handler(async (): Promise<HomeData> => {
  setResponseHeader("Cache-Control", "public, max-age=300");
  if (homeCache && Date.now() - homeCache.at < TTL) return homeCache.value;
  const value = await loadHome();
  homeCache = { at: Date.now(), value };
  return value;
});
