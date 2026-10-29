import { describe, it, expect } from "vitest";
import { extractPropertyCode, isValidPropertyCode, seoLabels } from "./property-seo";

describe("código no título", () => {
  it("aceita 2 letras + números e o padrão Univen", () => {
    expect(isValidPropertyCode("AP06943")).toBe(true);
    expect(isValidPropertyCode("SAP12842223")).toBe(true);
  });
  it("código inválido não vira 'Cód.'", () => {
    expect(extractPropertyCode({ internal_code: "ORMA", external_ref: "/x/123456", source_url: null })).toBeNull();
  });
});

describe("algarismos romanos", () => {
  it("mantém I e II em maiúsculo", () => {
    expect(seoLabels.cap("MELVILLE EMPRESARIAL I E II")).toBe("Melville Empresarial I e II");
  });
});
