// Testes do parseMoney via radarToPropertySearch, cobrindo as faixas reais
// das perguntas do Radar (PURCHASE_BUDGET, investment_capital, land_budget e aluguel).
// Executar com: bunx vitest run src/lib/radar-to-filters.test.ts
import { describe, expect, it } from "vitest";
import { radarToPropertySearch } from "./radar-to-filters";
import type { RadarAnswers } from "./radar-config";

describe("radarToPropertySearch — parseMoney de faixas reais do Radar", () => {
  // PURCHASE_BUDGET (compra, pergunta purchase_budget)
  const purchase: Array<[string, number, number]> = [
    ["Até R$ 800 mil", 0, 800_000],
    ["De R$ 800 mil a R$ 1,5 milhão", 800_000, 1_500_000],
    ["De R$ 1,5 milhão a R$ 3 milhões", 1_500_000, 3_000_000],
    ["De R$ 3 milhões a R$ 5 milhões", 3_000_000, 5_000_000],
    ["Acima de R$ 5 milhões", 5_000_000, 0],
  ];

  for (const [answer, min, max] of purchase) {
    it(`purchase_budget "${answer}" → min=${min} max=${max}`, () => {
      const s = radarToPropertySearch("buy_to_live", { purchase_budget: answer });
      expect(s.priceMin).toBe(min);
      expect(s.priceMax).toBe(max);
      expect(s.purpose).toBe("sale");
    });
  }

  // investment_capital (investimento, pergunta investment_capital)
  const capital: Array<[string, number, number]> = [
    ["Até R$ 500 mil", 0, 500_000],
    ["De R$ 500 mil a R$ 1 milhão", 500_000, 1_000_000],
    ["De R$ 1 milhão a R$ 2 milhões", 1_000_000, 2_000_000],
    ["De R$ 2 milhões a R$ 5 milhões", 2_000_000, 5_000_000],
    ["Acima de R$ 5 milhões", 5_000_000, 0],
  ];

  for (const [answer, min, max] of capital) {
    it(`investment_capital "${answer}" → min=${min} max=${max}`, () => {
      const s = radarToPropertySearch("real_estate_investment", { investment_capital: answer });
      expect(s.priceMin).toBe(min);
      expect(s.priceMax).toBe(max);
    });
  }

  // land_budget (terrenos, pergunta land_budget)
  const land: Array<[string, number, number]> = [
    ["Até R$ 500 mil", 0, 500_000],
    ["De R$ 500 mil a R$ 1 milhão", 500_000, 1_000_000],
    ["De R$ 1 milhão a R$ 2 milhões", 1_000_000, 2_000_000],
    ["Acima de R$ 2 milhões", 2_000_000, 0],
  ];

  for (const [answer, min, max] of land) {
    it(`land_budget "${answer}" → min=${min} max=${max}`, () => {
      const s = radarToPropertySearch("buy_land", { land_budget: answer });
      expect(s.priceMin).toBe(min);
      expect(s.priceMax).toBe(max);
      // "buy_land" sem tipo definido vira "terreno"
      expect(s.type).toBe("terreno");
    });
  }

  // RENT_BUDGET (aluguel, pergunta monthly_housing_budget) — continua "mil"
  const rent: Array<[string, number, number]> = [
    ["Até R$ 4 mil", 0, 4_000],
    ["De R$ 4 mil a R$ 7 mil", 4_000, 7_000],
    ["De R$ 7 mil a R$ 12 mil", 7_000, 12_000],
    ["Acima de R$ 20 mil", 20_000, 0],
  ];

  for (const [answer, min, max] of rent) {
    it(`monthly_housing_budget "${answer}" → min=${min} max=${max}`, () => {
      const s = radarToPropertySearch("rent_property", { monthly_housing_budget: answer });
      expect(s.priceMin).toBe(min);
      expect(s.priceMax).toBe(max);
      expect(s.purpose).toBe("rent");
    });
  }
});
