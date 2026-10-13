// Converte os parâmetros da URL de /imoveis nos argumentos da pesquisa no banco.
// Mesma interpretação de texto de antes (interpretQuery / residualLocationQuery).
import { interpretQuery, residualLocationQuery } from "./property-search";

export type ImoveisSearch = {
  purpose: string;
  type: string;
  city: string;
  neighborhood: string;
  condo: string;
  bedrooms: number;
  parking: number;
  priceMin: number;
  priceMax: number;
  areaMin: number;
  sort: string;
  q: string;
  page: number;
};

export const IMOVEIS_DEFAULTS: ImoveisSearch = {
  purpose: "", type: "", city: "", neighborhood: "", condo: "",
  bedrooms: 0, parking: 0, priceMin: 0, priceMax: 0, areaMin: 0,
  sort: "recent", q: "", page: 1,
};

export function effectiveSearch(s: ImoveisSearch): ImoveisSearch {
  if (!s.q) return s;
  const parsed = interpretQuery(s.q);
  return {
    ...s,
    purpose: s.purpose || parsed.purpose || "",
    type: s.type || parsed.type || "",
    city: s.city || parsed.city || "",
    neighborhood: s.neighborhood || parsed.neighborhood || "",
    bedrooms: s.bedrooms || parsed.bedrooms || 0,
    parking: s.parking || parsed.parking || 0,
    priceMax: s.priceMax || parsed.priceMax || 0,
  };
}

const STREET = new Set(["r","rua","av","avenida","ave","al","alameda","tv","travessa","pc","pca","praca","rod","rodovia","estr","estrada","lgo","largo","via"]);
const STOP = new Set(["de", "da", "do", "das", "dos", "e"]);

export function textTokens(q: string): string[] {
  const residual = residualLocationQuery(q);
  if (!residual) return [];
  return residual
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t && !STOP.has(t) && !STREET.has(t));
}

export function toRpcArgs(raw: ImoveisSearch, limit: number, offset: number) {
  const s = effectiveSearch(raw);
  const tokens = s.q ? textTokens(s.q) : [];
  const phrase = tokens.length ? `(^|[^a-z0-9])${tokens.join("[^a-z0-9]{0,3}")}([^a-z0-9]|$)` : null;
  return {
    p_purpose: s.purpose, p_type: s.type, p_city: s.city, p_neighborhood: s.neighborhood, p_condo: s.condo,
    p_bedrooms: s.bedrooms, p_parking: s.parking, p_price_min: s.priceMin, p_price_max: s.priceMax,
    p_area_min: s.areaMin, p_sort: s.sort, p_phrase: phrase as string | undefined, p_tokens: tokens,
    p_limit: limit, p_offset: offset,
  };
}
