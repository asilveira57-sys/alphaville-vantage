import { describe, it, expect, vi } from "vitest";
import { listingPrices, listingCode, compareListingPrice, appliedQuery, SEARCH_DELAY_MS } from "./property-listing";
import { IMOVEIS_DEFAULTS } from "./property-query";
describe("listing rules", () => {
  it("AP06837 uses rent as primary under Locação", () => {
    expect(listingPrices(957000, 5000, "rent", "both")).toEqual({ label: "Venda e locação", primary: "R$ 5.000/mês", secondary: "Venda: R$ 957.000" });
  });
  it("sale filter and all use sale first", () => {
    for (const filter of ["sale", ""]) expect(listingPrices(957000, 5000, filter, "both").secondary).toBe("Locação: R$ 5.000/mês");
  });
  it("rent ordering uses rent, not sale", () => {
    expect(compareListingPrice({ price_sale: 100000, price_rent: 9000 }, { price_sale: 957000, price_rent: 5000 }, "rent")).toBeGreaterThan(0);
  });
  it("all sorts sale before rent-only even cheaper rent", () => {
    expect(compareListingPrice({ price_sale: 100000, price_rent: null }, { price_sale: null, price_rent: 1000 })).toBeLessThan(0);
  });
  it("zero and missing prices stay last", () => {
    for (const desc of [false, true]) expect(compareListingPrice({ price_sale: 0, price_rent: null }, { price_sale: 100000, price_rent: null }, "", desc)).toBeGreaterThan(0);
  });
  it("card only shows valid reference codes", () => {
    expect(listingCode("AP06837")).toBe("AP06837"); expect(listingCode("ORMA")).toBeNull(); expect(listingCode("")).toBeNull();
  });
  it("text requires two characters but property code has no minimum", () => {
    expect(appliedQuery("é")).toBe(""); expect(appliedQuery("AP1")).toBe("AP1"); expect(appliedQuery("bellagio")).toBe("bellagio");
  });
  it("applies after 400 milliseconds of inactivity", () => {
    vi.useFakeTimers(); const apply = vi.fn(); setTimeout(apply, SEARCH_DELAY_MS); vi.advanceTimersByTime(399); expect(apply).not.toHaveBeenCalled(); vi.advanceTimersByTime(1); expect(apply).toHaveBeenCalledOnce(); vi.useRealTimers();
  });
  it("default sort is price ascending", () => { expect(IMOVEIS_DEFAULTS.sort).toBe("price_asc"); });
});