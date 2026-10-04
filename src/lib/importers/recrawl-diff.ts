// Comparação ficha da origem × banco para a recaptura em modo simulação.
// Nunca considera condominium_id nem slug; respeita manual_overrides.
import type { SaFicha } from "./sa-ficha";

export const RECRAWL_FIELDS = [
  "internal_code", "source_id", "property_type", "purpose", "condominium_name",
  "neighborhood", "city", "state", "bedrooms", "suites", "bathrooms", "lavabos",
  "parking", "area_useful", "area_built", "area_total", "price_sale", "price_rent",
  "condo_fee", "iptu", "iptu_period",
] as const;
export type RecrawlField = (typeof RECRAWL_FIELDS)[number];
type Val = string | number | null;
export type FieldChange = { field: RecrawlField; before: Val; after: Val };
export type OverrideConflict = { field: RecrawlField; manual: Val; origin: Val };
export type ReviewFlag = { field: RecrawlField; reason: string; origin: string | null };

export function fichaToFacts(f: SaFicha): Partial<Record<RecrawlField, unknown>> {
  const purpose = f.priceSale && f.priceRent ? "both" : f.priceRent ? "rent" : f.priceSale ? "sale" : null;
  return {
    internal_code: f.code, source_id: f.sourceId, property_type: f.propertyType, purpose,
    condominium_name: f.empreendimento, neighborhood: f.neighborhood, city: f.city, state: f.state,
    bedrooms: f.bedrooms, suites: f.suites, bathrooms: f.bathrooms, lavabos: f.lavabos, parking: f.parking,
    area_useful: f.areaUseful, area_built: f.areaBuilt, area_total: f.areaTotal ?? f.areaLand,
    price_sale: f.priceSale, price_rent: f.priceRent, condo_fee: f.condoFee, iptu: f.iptu,
    iptu_period: f.iptu != null ? f.iptuPeriod : null,
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

export function diffRecrawl(db: Record<string, unknown>, f: SaFicha): {
  changes: FieldChange[]; skippedOverrides: RecrawlField[]; overrideConflicts: OverrideConflict[]; reviews: ReviewFlag[];
} {
  const overrides = (db.manual_overrides ?? {}) as Record<string, unknown>;
  const facts = fichaToFacts(f);
  const changes: FieldChange[] = [];
  const skippedOverrides: RecrawlField[] = [];
  const overrideConflicts: OverrideConflict[] = [];
  const reviews: ReviewFlag[] = [];
  const dbPurpose = String(db.purpose ?? "");
  const dbHasRent = dbPurpose === "rent" || dbPurpose === "both";

  if (f.propertyTypeRaw) reviews.push({ field: "property_type", reason: "tipo fora da lista", origin: f.propertyTypeRaw });

  for (const field of RECRAWL_FIELDS) {
    const after = (facts[field] ?? null) as Val;
    if (after == null && !NULLABLE_FROM_SOURCE.has(field)) continue;
    const before = (db[field] ?? null) as Val;
    if (same(before, after)) continue;
    if (overrides[field] !== undefined) {
      skippedOverrides.push(field);
      overrideConflicts.push({ field, manual: before, origin: after });
      continue;
    }
    // Nunca rebaixar rent/both → sale nem apagar o aluguel de quem tem locação.
    if (dbHasRent && ((field === "purpose" && after === "sale") || (field === "price_rent" && after == null))) {
      reviews.push({ field, reason: "origem sem locação; mantido", origin: after == null ? null : String(after) });
      continue;
    }
    // Número positivo só vira 0 se a origem mostrar 0 explicitamente (contagens ausentes já são null).
    changes.push({ field, before, after });
  }
  return { changes, skippedOverrides, overrideConflicts, reviews };
}
