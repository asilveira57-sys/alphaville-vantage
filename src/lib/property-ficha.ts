// Ficha resumida de imóvel (propostas): mesmos rótulos na página do cliente,
// na tabela comparativa e no resumo enviado pelo WhatsApp.

export type FichaSource = {
  internal_code: string | null;
  title: string;
  purpose: string | null;
  property_type: string | null;
  price_sale: number | null;
  price_rent: number | null;
  condo_fee?: number | null;
  iptu?: number | null;
  iptu_period?: string | null;
  bedrooms: number | null;
  suites?: number | null;
  bathrooms?: number | null;
  parking: number | null;
  area_useful: number | null;
  area_built: number | null;
  area_total: number | null;
  furnished?: boolean | null;
  condominium_name: string | null;
  neighborhood: string | null;
  city: string | null;
};

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
const num = (n: number) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const pos = (n: number | null | undefined): n is number => n != null && Number(n) > 0;

export const hasSale = (p: FichaSource) => p.purpose !== "rent" && pos(p.price_sale);
export const hasRent = (p: FichaSource) => p.purpose !== "sale" && pos(p.price_rent);

export function fichaPrices(p: FichaSource) {
  return {
    sale: hasSale(p) ? brl(Number(p.price_sale)) : null,
    rent: hasRent(p) ? `${brl(Number(p.price_rent))}/mês` : null,
  };
}

/** IPTU mostrado por mês (anual ÷ 12) para dar para somar com o condomínio. */
export function iptuMonthly(p: FichaSource): number | null {
  if (!pos(p.iptu)) return null;
  const anual = /anual|ano|year/i.test(p.iptu_period ?? "");
  return anual ? Number(p.iptu) / 12 : Number(p.iptu);
}

export function mainArea(p: FichaSource): { label: string; value: number } | null {
  if (p.property_type === "terreno" || p.property_type === "área") {
    if (pos(p.area_total)) return { label: "Terreno", value: Number(p.area_total) };
  }
  if (pos(p.area_useful)) return { label: "Área útil", value: Number(p.area_useful) };
  if (pos(p.area_built)) return { label: "Área construída", value: Number(p.area_built) };
  if (pos(p.area_total)) return { label: "Área total", value: Number(p.area_total) };
  return null;
}

export type FichaRow = { label: string; value: string };

/** Linhas da ficha, só com o que existe. */
export function fichaRows(p: FichaSource): FichaRow[] {
  const rows: FichaRow[] = [];
  const pr = fichaPrices(p);
  if (pr.sale) rows.push({ label: "Venda", value: pr.sale });
  if (pr.rent) rows.push({ label: "Locação", value: pr.rent });
  if (pos(p.condo_fee)) rows.push({ label: "Condomínio", value: `${brl(Number(p.condo_fee))}/mês` });
  const iptu = iptuMonthly(p);
  if (iptu) rows.push({ label: "IPTU", value: `${brl(iptu)}/mês` });
  const area = mainArea(p);
  if (area) rows.push({ label: area.label, value: `${num(area.value)} m²` });
  if (pos(p.area_total) && area?.label !== "Terreno" && area?.label !== "Área total" && p.property_type === "casa")
    rows.push({ label: "Terreno", value: `${num(Number(p.area_total))} m²` });
  if (pos(p.bedrooms)) {
    const s = pos(p.suites) && Number(p.suites) <= Number(p.bedrooms) ? ` (${p.suites} suíte${Number(p.suites) > 1 ? "s" : ""})` : "";
    rows.push({ label: "Dormitórios", value: `${p.bedrooms}${s}` });
  }
  if (pos(p.bathrooms)) rows.push({ label: "Banheiros", value: String(p.bathrooms) });
  if (pos(p.parking)) rows.push({ label: "Vagas", value: String(p.parking) });
  if (p.furnished) rows.push({ label: "Mobiliado", value: "Sim" });
  return rows;
}

export function placeLine(p: FichaSource) {
  return [p.condominium_name, p.neighborhood, p.city].filter(Boolean).join(" · ");
}

export function shortTitle(p: FichaSource) {
  return p.title.split(/\s+[–—-]\s+/)[0];
}

/** Uma linha por imóvel para o resumo do WhatsApp. */
export function fichaLine(p: FichaSource, idx: number) {
  const pr = fichaPrices(p);
  const area = mainArea(p);
  const iptu = iptuMonthly(p);
  const parts = [
    p.condominium_name || p.neighborhood,
    area ? `${num(area.value)} m²` : null,
    pos(p.bedrooms) ? `${p.bedrooms} dorm.${pos(p.suites) && Number(p.suites) <= Number(p.bedrooms) ? ` (${p.suites} suíte${Number(p.suites) > 1 ? "s" : ""})` : ""}` : null,
    pos(p.parking) ? `${p.parking} vaga${Number(p.parking) > 1 ? "s" : ""}` : null,
  ].filter(Boolean);
  const money = [
    pr.sale ? `Venda ${pr.sale}` : null,
    pr.rent ? `Locação ${pr.rent}` : null,
    pos(p.condo_fee) ? `Cond. ${brl(Number(p.condo_fee))}` : null,
    iptu ? `IPTU ${brl(iptu)}/mês` : null,
  ].filter(Boolean);
  return `*${idx + 1}. ${p.property_type ? p.property_type[0].toUpperCase() + p.property_type.slice(1) : "Imóvel"}${p.internal_code ? ` · Cód. ${p.internal_code}` : ""}*\n${parts.join(" · ")}\n${money.join(" · ")}`;
}
