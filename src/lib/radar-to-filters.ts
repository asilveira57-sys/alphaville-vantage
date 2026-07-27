// Converte as respostas do Radar em filtros da listagem /imoveis.
import type { RadarAnswers } from "./radar-config";

export type PropertySearch = {
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
  sort: "recent" | "price_asc" | "price_desc" | "area_desc";
  q: string;
  page: number;
};

export const EMPTY_SEARCH: PropertySearch = {
  purpose: "",
  type: "",
  city: "",
  neighborhood: "",
  condo: "",
  bedrooms: 0,
  parking: 0,
  priceMin: 0,
  priceMax: 0,
  areaMin: 0,
  sort: "recent",
  q: "",
  page: 1,
};

const RENT_INTERESTS = ["rent_property"];
const SALE_INTERESTS = [
  "buy_to_live",
  "real_estate_investment",
  "new_development",
  "buy_land",
  "move_to_house",
  "change_location",
];

const TYPE_KEYS = [
  "property_type",
  "rental_property_type",
  "investment_asset_type",
  "development_type",
  "desired_house_type",
  "land_type",
];

const REGION_KEYS = [
  "preferred_regions",
  "rental_regions",
  "investment_regions",
  "development_regions",
  "target_location",
  "current_region",
];

const BEDROOM_KEYS = ["bedrooms", "rental_bedrooms", "house_bedrooms"];

const SALE_BUDGET_KEYS = ["purchase_budget", "house_purchase_budget", "land_budget", "investment_capital", "maximum_opportunity_value"];
const RENT_BUDGET_KEYS = ["monthly_housing_budget", "relocation_rent_budget"];

const CITY_REGIONS: Record<string, string> = {
  barueri: "Barueri",
  "santana de parnaiba": "Santana de Parnaíba",
  cajamar: "Cajamar",
};

const NEIGHBORHOOD_REGIONS: Record<string, string> = {
  alphaville: "Alphaville",
  tambore: "Tamboré",
  "aldeia da serra": "Aldeia da Serra",
};

const norm = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function values(answers: RadarAnswers, keys: string[]): string[] {
  const out: string[] = [];
  for (const k of keys) {
    const v = answers[k];
    if (Array.isArray(v)) out.push(...v);
    else if (v) out.push(v);
  }
  return out.map((v) => String(v).trim()).filter(Boolean);
}

function mapType(raw: string): string {
  const n = norm(raw);
  if (n.includes("apartamento")) return "apartamento";
  if (n.includes("casa") || n.includes("sobrado")) return "casa";
  if (n.includes("terreno") || n.includes("lote")) return "terreno";
  if (n.includes("galpao")) return "galpão";
  if (n.includes("loja")) return "loja";
  if (n.includes("sala") || n.includes("comercial")) return "sala";
  if (n.includes("predio")) return "prédio";
  return "";
}

function parseMoney(raw: string): { min: number; max: number } {
  const n = norm(raw);
  const nums = [...n.matchAll(/([\d.,]+)\s*(mil|milhao|milhoes|mi)?/g)]
    .map((m) => {
      const base = Number(m[1].replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(base) || base === 0) return 0;
      if (m[2] === "mil") return base * 1_000;
      if (m[2]) return base * 1_000_000;
      return base;
    })
    .filter((v) => v > 0);
  if (!nums.length) return { min: 0, max: 0 };
  if (n.startsWith("ate") || n.includes("até")) return { min: 0, max: nums[0] };
  if (n.startsWith("acima") || n.includes("mais de")) return { min: nums[0], max: 0 };
  if (nums.length >= 2) return { min: nums[0], max: nums[1] };
  return { min: 0, max: nums[0] };
}

function parseBedrooms(raw: string): number {
  const m = norm(raw).match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

export function radarToPropertySearch(interest: string, answers: RadarAnswers): PropertySearch {
  const search: PropertySearch = { ...EMPTY_SEARCH };

  if (RENT_INTERESTS.includes(interest)) search.purpose = "rent";
  else if (SALE_INTERESTS.includes(interest)) search.purpose = "sale";

  const type = values(answers, TYPE_KEYS).map(mapType).find(Boolean);
  if (type) search.type = type;
  if (interest === "buy_land" && !search.type) search.type = "terreno";

  for (const region of values(answers, REGION_KEYS)) {
    const n = norm(region);
    if (!search.neighborhood && NEIGHBORHOOD_REGIONS[n]) search.neighborhood = NEIGHBORHOOD_REGIONS[n];
    else if (!search.city && CITY_REGIONS[n]) search.city = CITY_REGIONS[n];
    if (search.neighborhood || search.city) break;
  }

  const bedrooms = values(answers, BEDROOM_KEYS).map(parseBedrooms).find((v) => v > 0);
  if (bedrooms) search.bedrooms = bedrooms;

  const budgetKeys = search.purpose === "rent" ? RENT_BUDGET_KEYS : SALE_BUDGET_KEYS;
  for (const raw of values(answers, budgetKeys)) {
    const { min, max } = parseMoney(raw);
    if (min || max) {
      search.priceMin = min;
      search.priceMax = max;
      break;
    }
  }

  return search;
}
