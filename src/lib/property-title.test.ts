import { describe, it, expect } from "vitest";
import { buildInternalTitle, buildSeoDescription, safeSuites, type SeoSource } from "./property-seo";
import { apiFactPatch } from "./importers/tokko";

const base = {
  property_type: "apartamento", purpose: "rent", city: "Barueri", state: "SP", neighborhood: "Alphaville",
  condominium_name: "Edifício Sol", bedrooms: 3, suites: 1, bathrooms: null, lavabos: null, parking: null,
  parking_covered: null, parking_uncovered: null, area_useful: 120, area_built: null, area_total: null,
  price_sale: null, price_rent: null, condo_fee: null, iptu: null, furnished: null, is_launch: null,
  accepts_exchange: null, internal_code: "AP06943", source_url: "https://x/12575108", external_ref: "/x/12575108",
} as SeoSource;

describe("título do imóvel", () => {
  it("usa o código de referência e dormitórios, sem suítes", () => {
    expect(buildInternalTitle(base)).toBe("Apartamento para locação no Edifício Sol, 3 dorm., 120 m² – Alphaville, Barueri – Cód. AP06943");
  });
  it("omite dorm. em terreno/sala/galpão/loja", () => {
    for (const t of ["terreno", "sala", "galpão", "loja"]) expect(buildInternalTitle({ ...base, property_type: t })).not.toContain("dorm.");
  });
});

describe("suítes nunca maiores que dormitórios", () => {
  it("safeSuites esvazia suítes > dormitórios", () => {
    expect(safeSuites(2, 3)).toBeNull();
    expect(safeSuites(2, 1)).toBe(1);
  });
  it("descrição não cita suítes maiores que dormitórios", () => {
    expect(buildSeoDescription({ ...base, bedrooms: 2, suites: 4 })).not.toContain("suíte");
  });
  it("sincronização limpa suítes quando passam dos dormitórios", () => {
    expect(apiFactPatch({ bedrooms: 2, suites: 4 }, { bedrooms: 2 }).patch.suites).toBeNull();
  });
});
