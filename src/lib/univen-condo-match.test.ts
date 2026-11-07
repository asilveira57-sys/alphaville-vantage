import { describe, expect, it } from "vitest";
import { buildCondoIndex, matchTag, usageCompatible, hasManualCondo, type CondoRef } from "./univen-condo-match";

const condos: CondoRef[] = [
  { id: "ls", name: "Link Studios", slug: "link-studios", usage: "residencial", status: "published" },
  { id: "lo", name: "Link Offices", slug: "link-offices", usage: "comercial", status: "published" },
  { id: "r2", name: "Residencial 2", slug: "residencial-2", usage: "residencial", status: "published" },
  { id: "ap", name: "Acqua Park", slug: "acqua-park", usage: null, status: "draft" },
  { id: "na", name: "Não se Aplica", slug: "nao-se-aplica", usage: null, status: "draft" },
  { id: "cc", name: "Campos do Conde Alphaville", slug: "campos-do-conde-alphaville", usage: "residencial", status: "published" },
];
const idx = buildCondoIndex(condos, [], [
  { normalized_tag: "link", usage: "residencial", condominium_id: "ls", ignored: false },
  { normalized_tag: "link", usage: "comercial", condominium_id: "lo", ignored: false },
  { normalized_tag: "campos do conde", usage: null, condominium_id: "cc", ignored: false },
]);
const id = (r: ReturnType<typeof matchTag>) => (r.kind === "match" ? r.condo.id : r.kind);

describe("vínculo pela etiqueta da Univen", () => {
  it("'Link' vai para Studios (apartamento) ou Offices (sala)", () => {
    expect(id(matchTag(idx, "Link", "apartamento"))).toBe("ls");
    expect(id(matchTag(idx, "Link", "sala"))).toBe("lo");
  });
  it("apelido Campos do Conde → Campos do Conde Alphaville", () => expect(id(matchTag(idx, "Campos do Conde", "casa"))).toBe("cc"));
  it("número equivalente: Residencial II = Residencial 2", () => expect(id(matchTag(idx, "Residencial II", "terreno"))).toBe("r2"));
  it("sala não se vincula a condomínio residencial", () => expect(id(matchTag(idx, "Residencial 2", "sala"))).toBe("incompatible"));
  it("condomínio desativado (Acqua Park genérico) e Não se Aplica não recebem vínculo", () => {
    expect(id(matchTag(idx, "Acqua Park", "apartamento"))).toBe("none");
    expect(id(matchTag(idx, "Não se Aplica", "casa"))).toBe("none");
  });
  it("uso misto aceita qualquer tipo; galpão só comercial/misto", () => {
    expect(usageCompatible("misto", "galpão")).toBe(true);
    expect(usageCompatible("residencial", "galpão")).toBe(false);
  });
  it("ajuste manual de condomínio bloqueia o vínculo automático", () => expect(hasManualCondo({ condominium_id: "x" })).toBe(true));
  it("terreno aceita condomínio residencial, comercial ou misto (TE00775)", () => {
    expect(usageCompatible("residencial", "terreno")).toBe(true);
    expect(usageCompatible("comercial", "terreno")).toBe(true);
    expect(usageCompatible("misto", "terreno")).toBe(true);
    const commercial = buildCondoIndex([{ id: "centro", name: "Centro Comercial", slug: "centro-comercial", usage: "comercial", status: "published" }], [], []);
    expect(id(matchTag(commercial, "Centro Comercial", "terreno"))).toBe("centro");
    const commercialAlias = buildCondoIndex([{ id: "centro", name: "Centro Comercial", slug: "centro-comercial", usage: "comercial", status: "published" }], [], [{ normalized_tag: "centro", usage: "comercial", condominium_id: "centro", ignored: false }]);
    expect(id(matchTag(commercialAlias, "Centro", "terreno"))).toBe("centro");
  });
});
