import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CondoPropertyDTO = {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  purpose: string | null;
  property_type: string | null;
  city: string | null;
  neighborhood: string | null;
  region: string | null;
  condominium_name: string | null;
  internal_code: string | null;
  bedrooms: number | null;
  parking: number | null;
  area: number | null;
  price_sale: number | null;
  price_rent: number | null;
};

const SELECT =
  "id,slug,title,images,purpose,property_type,city,neighborhood,region,condominium_name,internal_code,bedrooms,parking,parking_covered,parking_uncovered,area_useful,area_built,area_total,price_sale,price_rent,status";

type Row = Record<string, unknown>;

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

const firstImage = (images: unknown): string | null => {
  if (!Array.isArray(images)) return null;
  const first = images[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && typeof (first as { url?: string }).url === "string")
    return (first as { url: string }).url;
  return null;
};

const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

function toDTO(r: Row): CondoPropertyDTO {
  const parking =
    num(r["parking"]) ?? ((num(r["parking_covered"]) ?? 0) + (num(r["parking_uncovered"]) ?? 0) || null);
  return {
    id: String(r["id"]),
    slug: String(r["slug"] ?? ""),
    title: String(r["title"] ?? ""),
    image: firstImage(r["images"]),
    purpose: str(r["purpose"]),
    property_type: str(r["property_type"]),
    city: str(r["city"]),
    neighborhood: str(r["neighborhood"]),
    region: str(r["region"]),
    condominium_name: str(r["condominium_name"]),
    internal_code: str(r["internal_code"]),
    bedrooms: num(r["bedrooms"]),
    parking,
    area: num(r["area_useful"]) ?? num(r["area_built"]) ?? num(r["area_total"]),
    price_sale: num(r["price_sale"]),
    price_rent: num(r["price_rent"]),
  };
}

const listSchema = z.object({
  condominiumId: z.string().uuid().nullable().optional(),
  includedIds: z.array(z.string().uuid()).default([]),
  excludedIds: z.array(z.string().uuid()).default([]),
});

/** Imóveis do condomínio (vínculo do admin) + inclusões manuais, menos as exclusões. */
export const listCondoProperties = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => listSchema.parse(d))
  .handler(async ({ data }): Promise<{ condominiumName: string | null; items: CondoPropertyDTO[] }> => {
    const sb = publicClient();
    const excluded = new Set(data.excludedIds);
    let condominiumName: string | null = null;
    const auto: Row[] = [];

    if (data.condominiumId) {
      const { data: condo } = await sb
        .from("condominiums")
        .select("name")
        .eq("id", data.condominiumId)
        .maybeSingle();
      condominiumName = (condo as { name?: string } | null)?.name ?? null;

      const step = 500;
      for (let from = 0; ; from += step) {
        const { data: rows, error } = await sb
          .from("properties")
          .select(SELECT)
          .eq("condominium_id", data.condominiumId)
          .eq("status", "active")
          .order("price_sale", { ascending: false, nullsFirst: false })
          .range(from, from + step - 1);
        if (error) throw new Error(error.message);
        const batch = (rows ?? []) as Row[];
        auto.push(...batch);
        if (batch.length < step) break;
      }
    }

    const manual: Row[] = [];
    if (data.includedIds.length) {
      const { data: rows, error } = await sb
        .from("properties")
        .select(SELECT)
        .in("id", data.includedIds);
      if (error) throw new Error(error.message);
      manual.push(...((rows ?? []) as Row[]));
    }

    const seen = new Set<string>();
    const ordered: Row[] = [];
    // Manuais primeiro, na ordem escolhida no admin
    for (const id of data.includedIds) {
      const row = manual.find((r) => String(r["id"]) === id);
      if (row && !seen.has(id) && !excluded.has(id)) {
        seen.add(id);
        ordered.push(row);
      }
    }
    for (const row of auto) {
      const id = String(row["id"]);
      if (seen.has(id) || excluded.has(id)) continue;
      seen.add(id);
      ordered.push(row);
    }

    const items = ordered.map(toDTO).filter((p) => !!p.slug && !!p.title);
    return { condominiumName, items };
  });

/** Busca de imóveis para o seletor manual no admin. */
export const searchPropertiesForPicker = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().default("") }).parse(d))
  .handler(async ({ data, context }): Promise<CondoPropertyDTO[]> => {
    const term = data.q.trim();
    if (term.length < 2) return [];
    const like = `%${term}%`;
    const { data: rows, error } = await context.supabase
      .from("properties")
      .select(SELECT)
      .or(`title.ilike.${like},internal_code.ilike.${like},condominium_name.ilike.${like}`)
      .eq("status", "active")
      .limit(20);
    if (error) throw new Error(error.message);
    return ((rows ?? []) as Row[]).map(toDTO);
  });
