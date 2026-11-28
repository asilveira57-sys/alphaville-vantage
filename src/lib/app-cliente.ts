// App do cliente (PWA "S.A Imóveis"): tela de botões grandes em /app e busca
// guiada em /app/buscar. A busca guiada só monta os parâmetros de /imoveis —
// a pesquisa em si é sempre a mesma do portal (search_properties).
import { BRAND } from "@/lib/brand";

export type AppPurpose = "sale" | "rent";

export type AppChoice = { label: string; type: string; hint?: string };

export const TYPE_CHOICES: Record<AppPurpose, AppChoice[]> = {
  sale: [
    { label: "Casa", type: "casa" },
    { label: "Apartamento", type: "apartamento" },
    { label: "Terreno", type: "terreno" },
    { label: "Comercial", type: "comercial" },
  ],
  rent: [
    { label: "Casa", type: "casa" },
    { label: "Apartamento", type: "apartamento" },
    { label: "Comercial", type: "comercial" },
  ],
};

/** "Comercial" abre uma segunda escolha: no banco cada um é um tipo próprio. */
export const COMMERCIAL_CHOICES: AppChoice[] = [
  { label: "Sala", type: "sala" },
  { label: "Galpão", type: "galpão" },
  { label: "Loja", type: "loja" },
  { label: "Prédio", type: "prédio" },
];

/** Atalhos de região (busca aproximada de bairro, igual a ?neighborhood=Alphaville). */
export const REGION_CHOICES = [
  { label: "Alphaville", neighborhood: "Alphaville" },
  { label: "Tamboré", neighborhood: "Tamboré" },
  { label: "Aldeia da Serra", neighborhood: "Aldeia da Serra" },
];

export type PriceRange = { label: string; min: number; max: number };

export const PRICE_CHOICES: Record<AppPurpose, PriceRange[]> = {
  sale: [
    { label: "Até R$ 1 milhão", min: 0, max: 1_000_000 },
    { label: "R$ 1 a 2 milhões", min: 1_000_000, max: 2_000_000 },
    { label: "R$ 2 a 3 milhões", min: 2_000_000, max: 3_000_000 },
    { label: "R$ 3 a 5 milhões", min: 3_000_000, max: 5_000_000 },
    { label: "Acima de R$ 5 milhões", min: 5_000_000, max: 0 },
  ],
  rent: [
    { label: "Até R$ 5 mil", min: 0, max: 5_000 },
    { label: "R$ 5 a 10 mil", min: 5_000, max: 10_000 },
    { label: "R$ 10 a 20 mil", min: 10_000, max: 20_000 },
    { label: "Acima de R$ 20 mil", min: 20_000, max: 0 },
  ],
};

export const BEDROOM_CHOICES = [1, 2, 3, 4];

/** Tipos em que a pergunta de dormitórios faz sentido. */
export const hasBedrooms = (type: string) => type === "casa" || type === "apartamento";

export type AppSearch = {
  purpose: AppPurpose;
  type: string;
  neighborhood: string;
  condo: string;
  condoName: string;
  min: number;
  max: number;
  bedrooms: number;
};

export const emptyAppSearch = (purpose: AppPurpose): AppSearch => ({
  purpose, type: "", neighborhood: "", condo: "", condoName: "", min: 0, max: 0, bedrooms: 0,
});

/** Parâmetros de /imoveis (só os preenchidos). */
export function toImoveisSearch(s: AppSearch) {
  const out: Record<string, string | number> = { purpose: s.purpose };
  if (s.type) out.type = s.type;
  if (s.condo) out.condo = s.condo;
  else if (s.neighborhood) out.neighborhood = s.neighborhood;
  if (s.min) out.min = s.min;
  if (s.max) out.max = s.max;
  if (s.bedrooms) out.bedrooms = s.bedrooms;
  return out;
}

export const APP_WHATSAPP_URL = `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(
  "Olá! Vim pelo app da S.A Imóveis e gostaria de atendimento.",
)}`;

export function trackApp(event: string, params: Record<string, unknown> = {}) {
  try {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("event", event, { app: "cliente", ...params });
  } catch {
    /* ignore */
  }
}
