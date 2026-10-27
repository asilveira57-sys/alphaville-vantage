export const FINANCING_PAGE = "/simulador-de-financiamento";

/** Uma faixa de 10% ao redor do orçamento informado, somente imóveis à venda. */
export function financingPropertyRange(value: number) {
  return { purpose: "sale", priceMin: Math.round(value * 0.9), priceMax: Math.round(value * 1.1) };
}

export function financingPageAttribution() {
  return { source: "financiamento", landing_page: FINANCING_PAGE };
}