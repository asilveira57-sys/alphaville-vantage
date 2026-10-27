import { describe, expect, it } from "vitest";
import { financingPageAttribution, financingPropertyRange } from "./financing-page";

describe("simulador independente", () => {
  it("registra origem financiamento", () => {
    expect(financingPageAttribution().source).toBe("financiamento");
  });
  it("registra a página solicitada", () => {
    expect(financingPageAttribution().landing_page).toBe("/simulador-de-financiamento");
  });
  it("busca venda na faixa de orçamento", () => {
    expect(financingPropertyRange(1000000)).toEqual({ purpose: "sale", priceMin: 900000, priceMax: 1100000 });
  });
});