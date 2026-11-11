import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { publicClient } from "./property-search.functions";


const isUsableImg = (u: string) =>
  /^https?:\/\//.test(u) &&
  !/(logo|favicon|whats|placeholder|topo_contato|supremo_|topo_)/i.test(u);

export type RelatedProperty = {
  internal_code: string | null;
  purpose: string | null;
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
  "id,slug,title,status,seo_title,seo_description,property_type,purpose,city,state,neighborhood,region,condominium_name,condominium_id,bedrooms,suites,bathrooms,lavabos,parking,parking_covered,parking_uncovered,area_useful,area_built,area_total,price_sale,price_rent,condo_fee,iptu,iptu_period,furnished,is_launch,accepts_exchange,description,descricao_seo,descricao_original,internal_code,external_ref,source_url,images,large_image_url,in_acervo";

export type PropertyDetailDTO = {
  id: string;
  slug: string;
  title: string;
  status: string;
  seo_title: string | null;
  seo_description: string | null;
  property_type: string | null;
  purpose: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  region: string | null;
  condominium_name: string | null;
  condominium_id: string | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  lavabos: number | null;
  parking: number | null;
  parking_covered: number | null;
  parking_uncovered: number | null;
  area_useful: number | null;
  area_built: number | null;
  area_total: number | null;
  price_sale: number | null;
  price_rent: number | null;
  condo_fee: number | null;
  iptu: number | null;
  iptu_period: string | null;
  furnished: boolean | null;
  is_launch: boolean | null;
  accepts_exchange: boolean | null;
  description: string | null;
  descricao_seo: string | null;
  descricao_original: string | null;
  internal_code: string | null;
  external_ref: string | null;
  source_url: string | null;
  images: string[];
  large_image_url: string | null;
  in_acervo: boolean;
  related: RelatedProperty[];
};


async function fetchProperty(slug: string): Promise<PropertyDetailDTO | null> {
  const { data, error } = await publicClient()
    .from("properties")
    .select(PROPERTY_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  // Veja também: até 3 imóveis no mesmo bairro/tipo, excluindo o atual.
  let related: RelatedProperty[] = [];
  if (data.neighborhood) {
    const { data: rel } = await publicClient()
      .from("properties")
      .select("id,slug,title,seo_title,internal_code,purpose,property_type,price_sale,price_rent,images,card_image_url")
      .eq("status", "active")
      .eq("neighborhood", data.neighborhood)
      .neq("id", data.id)
      .order("listing_sale_group", { ascending: true }).order("listing_price", { ascending: true, nullsFirst: false }).order("id", { ascending: true })
      .limit(6);
    related = ((rel ?? []) as unknown as Array<RelatedProperty & { images: unknown }>)
      .map((r) => ({
        ...r,
        images: Array.isArray(r.images) ? (r.images as string[]).filter(isUsableImg) : [],
      }))
      .slice(0, 3);
  }

  return {
    ...data,
    images: Array.isArray(data.images) ? (data.images as string[]).filter(isUsableImg) : [],
    related,
  } as unknown as PropertyDetailDTO;
}

export const getPropertyBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(220) }).parse(d))
  .handler(async ({ data }): Promise<PropertyDetailDTO | null> => {
    setResponseHeader("Cache-Control", "no-store");
    return fetchProperty(data.slug);
  });
