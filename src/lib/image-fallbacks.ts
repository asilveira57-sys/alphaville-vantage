// Fallback images per region/type. Uses assets already in src/assets/.
import alphavilleImg from "@/assets/region-alphaville.jpg";
import tamboreImg from "@/assets/region-tambore.jpg";
import barueriImg from "@/assets/region-barueri.jpg";
import santanaImg from "@/assets/region-santana.jpg";
import interiorImg from "@/assets/article-interior.jpg";
import gardenImg from "@/assets/article-garden.jpg";
import clubhouseImg from "@/assets/article-clubhouse.jpg";
import property1 from "@/assets/property-1.jpg";
import property2 from "@/assets/property-2.jpg";
import property3 from "@/assets/property-3.jpg";
import heroImg from "@/assets/hero-architecture.jpg";
import institutional from "@/assets/institutional.jpg";

export type FallbackKind = "region" | "post" | "property" | "condo" | "generic";

const REGION_MAP: Record<string, string> = {
  alphaville: alphavilleImg,
  tambore: tamboreImg,
  tamboré: tamboreImg,
  barueri: barueriImg,
  santana: santanaImg,
  "santana-de-parnaiba": santanaImg,
  "santana de parnaíba": santanaImg,
};

const POST_POOL = [interiorImg, gardenImg, clubhouseImg, heroImg, institutional];
const PROPERTY_POOL = [property1, property2, property3, interiorImg, gardenImg];
const CONDO_POOL = [gardenImg, clubhouseImg, alphavilleImg, tamboreImg];

const norm = (s?: string | null) =>
  (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const pickFromPool = (pool: string[], seed?: string | null) => {
  const key = norm(seed);
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return pool[hash % pool.length] ?? pool[0];
};

export function getFallbackImage(opts: {
  type?: FallbackKind;
  region?: string | null;
  seed?: string | null;
}): string {
  const region = norm(opts.region);
  if (region) {
    for (const key of Object.keys(REGION_MAP)) {
      if (region.includes(key)) return REGION_MAP[key];
    }
  }
  switch (opts.type) {
    case "region":
      return alphavilleImg;
    case "property":
      return pickFromPool(PROPERTY_POOL, opts.seed);
    case "condo":
      return pickFromPool(CONDO_POOL, opts.seed);
    case "post":
      return pickFromPool(POST_POOL, opts.seed);
    default:
      return pickFromPool(POST_POOL, opts.seed);
  }
}

export function resolveImage(
  src: string | null | undefined,
  fallback: Parameters<typeof getFallbackImage>[0],
): string {
  const bad = !src || /^\s*$/.test(src) || /(logo|favicon|whats|placeholder|topo_contato)/i.test(src);
  return bad ? getFallbackImage(fallback) : src;
}
