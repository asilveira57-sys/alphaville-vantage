import { isValidPropertyCode } from "./property-seo";

export const SEARCH_DELAY_MS = 400;
export const listingCode = (code?: string | null) => isValidPropertyCode(code) ? code?.trim().toUpperCase() ?? null : null;
export const appliedQuery = (q: string) => q.trim().length >= 2 || /^(?:[a-z]{1,3}\d*|\d+)$/i.test(q.trim()) ? q.trim() : "";
const positive = (n?: number | null) => n != null && n > 0 ? n : null;
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).replace(/\s/g, " ");
export function listingPrices(sale?: number | null, rent?: number | null, filter = "", purpose?: string | null) {
  const s = positive(sale), r = positive(rent);
  const rentFirst = filter === "rent" || (!s && !!r);
  const primaryValue = rentFirst ? r : s;
  return {
    label: purpose === "both" || (s && r) ? "Venda e locação" : purpose === "rent" || rentFirst ? "Locação" : purpose === "sale" || s ? "Venda" : "Consulta",
    primary: primaryValue ? `${brl(primaryValue)}${rentFirst ? "/mês" : ""}` : "Sob consulta",
    secondary: rentFirst ? s ? `Venda: ${brl(s)}` : null : r ? `Locação: ${brl(r)}/mês` : null,
  };
}
export function compareListingPrice(a: { price_sale: number | null; price_rent: number | null }, b: { price_sale: number | null; price_rent: number | null }, purpose = "", descending = false) {
  const value = (p: typeof a) => positive(purpose === "rent" ? p.price_rent : purpose === "sale" ? p.price_sale : positive(p.price_sale) ?? p.price_rent);
  const av = value(a), bv = value(b);
  if (av == null || bv == null) return av == null ? bv == null ? 0 : 1 : -1;
  if (!purpose && !descending) {
    const group = Number(!positive(a.price_sale)) - Number(!positive(b.price_sale));
    if (group) return group;
  }
  return descending ? bv - av : av - bv;
}