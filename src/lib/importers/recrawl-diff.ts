// Comparação ficha da origem × banco para a recaptura em modo simulação.
// Nunca considera condominium_id nem slug; respeita manual_overrides.
import type { SaFicha } from "./sa-ficha";

export const RECRAWL_FIELDS = [
  "internal_code", "source_id", "property_type", "purpose", "condominium_name",
  "neighborhood", "city", "state", "bedrooms", "suites", "bathrooms", "lavabos",
  "parking", "area_useful", "area_built", "area_total", "price_sale", "price_rent",
  "condo_fee", "iptu",
] as const;
export type RecrawlField = (typeof RECRAWL_FIELDS)[number];
export type FieldChange = { field: RecrawlField; before: string | number | null; after: string | number | null };

export function fichaToFacts(f: SaFicha): Partial<Record<RecrawlField, unknown>> {
  const purpose = f.priceSale && f.priceRent ? "both" : f.priceRent ? "rent" : f.priceSale ? "sale" : null;
  return {
    internal_code: f.code, source_id: f.sourceId, property_type: f.propertyType, purpose,
    condominium_name: f.empreendimento, neighborhood: f.neighborhood, city: f.city, state: f.state,
    bedrooms: f.bedrooms, suites: f.suites, bathrooms: f.bathrooms, lavabos: f.lavabos, parking: f.parking,
    area_useful: f.areaUseful, area_built: f.areaBuilt, area_total: f.areaTotal ?? f.areaLand,
    price_sale: f.priceSale, price_rent: f.priceRent, condo_fee: f.condoFee, iptu: f.iptu,
  };
}

// Campos em que a ausência na ficha significa "não tem" (pode limpar o banco).
const NULLABLE_FROM_SOURCE = new Set<RecrawlField>(["price_sale", "price_rent", "condo_fee", "iptu", "condominium_name"]);

function same(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (typeof a === "number" || typeof b === "number") {
    const x = Number(a), y = Number(b);
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) < 0.005;
  }
  return String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
}

export function diffRecrawl(db: Record<string, unknown>, f: SaFicha): { changes: FieldChange[]; skippedOverrides: RecrawlField[] } {
  const overrides = (db.manual_overrides ?? {}) as Record<string, unknown>;
  const facts = fichaToFacts(f);
  const changes: FieldChange[] = [];
  const skippedOverrides: RecrawlField[] = [];
  for (const field of RECRAWL_FIELDS) {
    const after = facts[field] ?? null;
    if (after == null && !NULLABLE_FROM_SOURCE.has(field)) continue;
    const before = db[field] ?? null;
    if (same(before, after)) continue;
    if (overrides[field] !== undefined) { skippedOverrides.push(field); continue; }
    changes.push({ field, before: before as string | number | null, after: after as string | number | null });
  }
  return { changes, skippedOverrides };
}
