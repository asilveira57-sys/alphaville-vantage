import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { publicClient } from "./property-search.functions";

// Cache de 5 min por slug no servidor. A rotina diária de conciliação altera
// imóveis, mas o cache é por instância do servidor e não dá para invalidá-lo
// de fora de forma confiável — o TTL de 5 min é o limite de defasagem.
const TTL = 300_000;
const MAX_ENTRIES = 3000;

const isUsableImg = (u: string) =>
  /^https?:\/\//.test(u) &&
  !/(logo|favicon|whats|placeholder|topo_contato|supremo_|topo_)/i.test(u);

export type RelatedProperty = {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  property_type: string | null;
  price_sale: number | null;
  price_rent: number | null;
  images: string[];
  card_image_url?: string | null;
};

const PROPERTY_SELECT =
  "id,slug,title,status,seo_title,seo_description,property_type,purpose,city,state,neighborhood,region,condominium_name,condominium_id,bedrooms,suites,bathrooms,lavabos,parking,parking_covered,parking_uncovered,area_useful,area_built,area_total,price_sale,price_rent,condo_fee,iptu,iptu_period,furnished,is_launch,accepts_exchange,description,descricao_seo,descricao_original,internal_code,external_ref,source_url,images,large_image_url";

type PropertyRow = Record<string, unknown> & { id: string; neighborhood: string | null; property_type: string | null; images: unknown };

export type PropertyDetailDTO = Omit<PropertyRow, "images"> & {
  images: string[];
  related: RelatedProperty[];
};

const cache = new Map<string, { at: number; value: PropertyDetailDTO | null }>();

async function fetchProperty(slug: string): Promise<PropertyDetailDTO | null> {
  const { data, error } = await publicClient()
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as PropertyRow;

  // Veja também: até 3 imóveis no mesmo bairro/tipo, excluindo o atual.
  let related: RelatedProperty[] = [];
  if (row.neighborhood) {
    const { data: rel } = await publicClient()
      .from("properties")
      .select("id,slug,title,seo_title,property_type,price_sale,price_rent,images,card_image_url")
      .eq("status", "active")
      .eq("neighborhood", row.neighborhood)
      .neq("id", row.id)
      .order("last_seen_at", { ascending: false })
      .limit(6);
    related = ((rel ?? []) as unknown as Array<RelatedProperty & { images: unknown }>)
      .map((r) => ({
        ...r,
        images: Array.isArray(r.images) ? (r.images as string[]).filter(isUsableImg) : [],
      }))
      .slice(0, 3);
  }

  return {
    ...row,
    images: Array.isArray(row.images) ? (row.images as string[]).filter(isUsableImg) : [],
    related,
  } as PropertyDetailDTO;
}

export const getPropertyBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(220) }).parse(d))
  .handler(async ({ data }): Promise<PropertyDetailDTO | null> => {
    setResponseHeader("Cache-Control", "public, max-age=300");
    const hit = cache.get(data.slug);
    if (hit && Date.now() - hit.at < TTL) return hit.value;
    const value = await fetchProperty(data.slug);
    if (cache.size >= MAX_ENTRIES) cache.clear();
    cache.set(data.slug, { at: Date.now(), value });
    return value;
  });
