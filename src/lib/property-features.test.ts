import { describe, it, expect } from "vitest";
import { tokkoExtras, furnishingFromText, featureGroup, featureSlug } from "./property-features";

describe("tokkoExtras", () => {
  it("separa características, estilo e mobília e esconde etiquetas comerciais", () => {
    const r = tokkoExtras({
      tags: [{ name: "Piscina" }, { name: "Churrasqueira de varanda" }, { name: "Varanda Gourmet" }, { name: "Mobiliado" }],
      custom_tags: [
        { group_name: "Categoria", name: "Térrea" }, { group_name: "Empreendimento", name: "Bellagio" },
        { group_name: "Outros", name: "Imóvel com parceria" }, { group_name: "Outros", name: "Portal Destaque" },
      ],
    });
    expect(r.features).toEqual(["Piscina", "Varanda gourmet"]);
    expect(r.category).toBe("terreo");
    expect(r.furnishing).toBe("mobiliado");
  });
  it("sem etiquetas devolve nulo (não apaga)", () => {
    expect(tokkoExtras({})).toEqual({ features: null, category: null, furnishing: null });
  });
  it("semi-mobiliado não vira mobiliado", () => {
    expect(tokkoExtras({ tags: [{ name: "Semi-mobiliado" }] }).furnishing).toBe("semi-mobiliado");
    expect(furnishingFromText("Apartamento semi-mobiliado")).toBe("semi-mobiliado");
    expect(furnishingFromText("Entregue sem mobília")).toBe("sem-mobilia");
    expect(furnishingFromText("Casa mobiliada")).toBe("mobiliado");
  });
  it("grupos e slug", () => {
    expect(featureGroup("Piscina")).toBe("lazer");
    expect(featureGroup("Varanda gourmet")).toBe("imovel");
    expect(featureGroup("Vista panorâmica")).toBe("estado");
    expect(featureSlug("Varanda gourmet")).toBe("varanda-gourmet");
    expect(featureGroup("Área de churrasco comum")).toBe("lazer");
    expect(featureGroup("Lavanderia coletiva")).toBe("lazer");
    expect(featureGroup("Lavanderia")).toBe("imovel");
    expect(featureGroup("Renovado")).toBe("estado");
    expect(tokkoExtras({ tags: [{ name: "Grupo ZAP" }, { name: "Piscina" }] }).features).toEqual(["Piscina"]);
  });
});
