/**
 * Apuração do R$/m² de referência para a Vitrine de Oportunidades.
 *
 * Lógica pura, sem I/O: recebe o imóvel e o universo de comparáveis, devolve
 * a apuração. Fica separada das server functions porque é a peça que precisa
 * ser auditável — é ela que sustenta a alegação de preço exibida ao público.
 *
 * Escolhas deliberadas:
 *
 * - **Mediana, não média.** Um outlier numa amostra pequena destrói a
 *   credibilidade do selo inteiro.
 * - **Amostra mínima de 5.** Abaixo disso o imóvel pode entrar na vitrine
 *   pela curadoria editorial, mas sem selo de preço.
 * - **Preços de anúncio, não de transação.** É o que o acervo tem, e é o que
 *   o rótulo público diz. Chamar isso de "mercado" seria a comparação
 *   irrealista que o CONAR art. 27 §3º veda.
 */

export const MIN_SAMPLE = 5;
/** Quanto abaixo da referência o imóvel precisa estar para receber o selo. */
export const QUALIFYING_DELTA_PCT = -10;
/** Anúncio parado há mais de um ano não serve de comparável. */
export const COMPARABLE_MAX_AGE_MONTHS = 12;

export const SOURCE_LABEL = "acervo S.A Imóveis — preços de anúncio";

export type ValuationMethod = "condo_median" | "neighborhood_median";

export type ComparableInput = {
  id: string;
  slug: string;
  title: string;
  price_sale: number | null;
  area: number | null;
  property_type: string | null;
  bedrooms: number | null;
  condominium_id: string | null;
  condominium_name: string | null;
  neighborhood: string | null;
  last_seen_at: string | null;
};

export type ComparableUsed = {
  id: string;
  slug: string;
  price_sale: number;
  area: number;
  sqm_price: number;
};

export type Valuation = {
  method: ValuationMethod;
  property_sqm_price: number;
  reference_sqm_price: number;
  delta_pct: number;
  sample_size: number;
  window_months: number;
  comparables: ComparableUsed[];
  source_label: string;
  qualifies: boolean;
};

const norm = (v: string | null | undefined) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function sqmPrice(price: number | null, area: number | null): number | null {
  if (price == null || area == null || area <= 0 || price <= 0) return null;
  return price / area;
}

function isFresh(iso: string | null): boolean {
  if (!iso) return true; // sem data de captura, não descarta
  const age = Date.now() - Date.parse(iso);
  return Number.isFinite(age) ? age <= COMPARABLE_MAX_AGE_MONTHS * 30 * 86_400_000 : true;
}

function toUsed(c: ComparableInput): ComparableUsed | null {
  const value = sqmPrice(c.price_sale, c.area);
  if (value == null) return null;
  return {
    id: c.id,
    slug: c.slug,
    price_sale: c.price_sale!,
    area: c.area!,
    sqm_price: Math.round(value),
  };
}

/**
 * Seleciona os comparáveis, do recorte mais estrito para o mais largo.
 *
 * 1. mesmo condomínio + mesmo tipo + mesmo número de dormitórios
 * 2. mesmo condomínio + mesmo tipo, dormitórios ±1
 * 3. mesmo bairro + mesmo tipo, dormitórios ±1
 *
 * Para no primeiro recorte que atinge a amostra mínima. O método usado é
 * declarado junto com o selo — o leitor sabe contra o que está comparando.
 */
export function selectComparables(
  target: ComparableInput,
  pool: ComparableInput[],
): { method: ValuationMethod; items: ComparableUsed[] } | null {
  const usable = pool.filter(
    (c) =>
      c.id !== target.id &&
      isFresh(c.last_seen_at) &&
      sqmPrice(c.price_sale, c.area) != null &&
      norm(c.property_type) === norm(target.property_type),
  );

  const sameCondo = (c: ComparableInput) =>
    target.condominium_id && c.condominium_id
      ? c.condominium_id === target.condominium_id
      : Boolean(norm(target.condominium_name)) &&
        norm(c.condominium_name) === norm(target.condominium_name);

  const sameBedrooms = (c: ComparableInput) =>
    target.bedrooms == null || c.bedrooms === target.bedrooms;

  const nearBedrooms = (c: ComparableInput) =>
    target.bedrooms == null || c.bedrooms == null
      ? true
      : Math.abs(c.bedrooms - target.bedrooms) <= 1;

  const tiers: { method: ValuationMethod; filter: (c: ComparableInput) => boolean }[] = [
    { method: "condo_median", filter: (c) => sameCondo(c) && sameBedrooms(c) },
    { method: "condo_median", filter: (c) => sameCondo(c) && nearBedrooms(c) },
    {
      method: "neighborhood_median",
      filter: (c) =>
        Boolean(norm(target.neighborhood)) &&
        norm(c.neighborhood) === norm(target.neighborhood) &&
        nearBedrooms(c),
    },
  ];

  for (const tier of tiers) {
    const items = usable
      .filter(tier.filter)
      .map(toUsed)
      .filter((c): c is ComparableUsed => c != null);
    if (items.length >= MIN_SAMPLE) return { method: tier.method, items };
  }

  return null;
}

/** Apura o imóvel contra o acervo. Devolve null quando não há amostra suficiente. */
export function buildValuation(target: ComparableInput, pool: ComparableInput[]): Valuation | null {
  const own = sqmPrice(target.price_sale, target.area);
  if (own == null) return null;

  const selection = selectComparables(target, pool);
  if (!selection) return null;

  const reference = median(selection.items.map((c) => c.sqm_price));
  if (reference <= 0) return null;

  const delta = ((own - reference) / reference) * 100;

  return {
    method: selection.method,
    property_sqm_price: Math.round(own),
    reference_sqm_price: Math.round(reference),
    delta_pct: Math.round(delta * 10) / 10,
    sample_size: selection.items.length,
    window_months: COMPARABLE_MAX_AGE_MONTHS,
    comparables: selection.items,
    source_label: SOURCE_LABEL,
    qualifies: delta <= QUALIFYING_DELTA_PCT,
  };
}

export const METHOD_LABEL: Record<ValuationMethod, string> = {
  condo_median: "no mesmo condomínio",
  neighborhood_median: "no mesmo bairro",
};

/** Texto do selo. Só existe quando há apuração — não há versão genérica. */
export function badgeText(v: { delta_pct: number }): string {
  return `R$/m² ${Math.abs(v.delta_pct).toFixed(1).replace(".", ",")}% abaixo da referência`;
}
