import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractSaFicha } from "./sa-ficha";
import { parseSaImoveis } from "./sa-imoveis.parser";
import { parsePropertyText } from "../property-parser";

const fx = (id: string) => readFileSync(join(__dirname, "__fixtures__", `sa-${id}.html`), "utf8");
const BASE = "https://saimoveisalphaville.com.br";

describe("ficha S.A. — apartamento 77891505 (Life Park)", () => {
  const url = `${BASE}/comprar/sp/barueri/alphaville-empresarial/apartamento/77891505`;
  const f = extractSaFicha(fx("77891505"), url);
  it("lê os fatos rotulados", () => {
    expect(f).toMatchObject({
      found: true, sourceId: "77891505", code: "AP06648", propertyType: "apartamento",
      bedrooms: 2, suites: 1, bathrooms: 2, lavabos: null, parking: 1,
      areaUseful: 62, areaBuilt: 62, priceSale: 750000, priceRent: null,
      condoFee: 660, iptu: 380, iptuPeriod: "anual",
      empreendimento: "Life Park", neighborhood: "Alphaville Empresarial", city: "Barueri", state: "SP",
    });
  });
  it("parser usa a ficha e ignora filtros/semelhantes", () => {
    const { listing } = parseSaImoveis(fx("77891505"), url);
    expect(listing.internalCode).toBe("AP06648");
    expect(listing.externalCode).toBe("77891505");
    expect(listing.address.condominiumText).toBe("Life Park");
    expect(listing.rooms).toMatchObject({ bedrooms: 2, suites: 1, bathrooms: 2, lavabos: null, parking: 1 });
    expect(listing.prices).toMatchObject({ sale: 750000, rent: null, condoFee: 660, iptu: 380 });
    expect(listing.address.condominiumText).not.toMatch(/lan[çc]amento|metragem/i);
  });
});

describe("ficha S.A. — casa 70735362 (Residencial 10)", () => {
  const f = extractSaFicha(fx("70735362"), `${BASE}/comprar/sp/santana-de-parnaiba/alphaville/casa/70735362`);
  it("lê os fatos rotulados", () => {
    expect(f).toMatchObject({
      code: "CA02198", propertyType: "casa", bedrooms: 4, suites: 4, bathrooms: 6, parking: 6,
      areaTotal: 640, areaUseful: 500, areaLand: 640, areaBuilt: 500,
      priceSale: 3300000, priceRent: null, condoFee: 1346, iptu: 561,
      empreendimento: "Residencial 10", neighborhood: "Alphaville", city: "Santana de Parnaíba", state: "SP",
    });
  });
});

describe("ficha S.A. — locação 78852885 (Novare)", () => {
  const f = extractSaFicha(fx("78852885"), `${BASE}/alugar/sp/barueri/melville-empresarial--i-e--ii/apartamento/78852885`);
  it("lê os fatos rotulados", () => {
    expect(f).toMatchObject({
      code: "AP07190", bedrooms: 1, suites: null, bathrooms: 1, parking: 1,
      areaUseful: 50, areaBuilt: 50, priceSale: null, priceRent: 4300,
      condoFee: 661, iptu: 85, iptuPeriod: "mensal",
      empreendimento: "Novare", neighborhood: "Melville Empresarial I e II", city: "Barueri",
    });
  });
});

describe("detectCondoFromTitle — rejeita palavras de interface", () => {
  it("não aceita 'Condomínio Lançamento Metragem'", () => {
    expect(parsePropertyText({ title: "Condomínio Lançamento Metragem" }).condominium_name).toBeNull();
    expect(parsePropertyText({ title: "condomínio Valor Dormitórios" }).condominium_name).toBeNull();
  });
  it("aceita nome real", () => {
    expect(parsePropertyText({ title: "Casa no Condomínio Vila Solaris" }).condominium_name).toBe("Condomínio Vila Solaris");
  });
});

describe("ficha S.A. — venda e locação 78576983", () => {
  const f = extractSaFicha(fx("78576983"), `${BASE}/alugar/sp/barueri/alphaville-empresarial/apartamento/78576983`);
  it("lê os dois preços", () => {
    expect(f).toMatchObject({ code: "AP07023", priceSale: 1300000, priceRent: 9500, condoFee: 1350, iptu: 72, iptuPeriod: "mensal" });
  });
});

describe("ficha S.A. — locação com pacote 76038101", () => {
  const f = extractSaFicha(fx("76038101"), `${BASE}/alugar/sp/barueri/alphaville-residencial-um/casa/76038101`);
  it("aluguel (não o pacote) e banheiros ausentes = null", () => {
    expect(f).toMatchObject({ code: "CA03225", propertyType: "casa", priceRent: 33491.66, priceSale: null, bathrooms: null, lavabos: null, bedrooms: 4, suites: 2, parking: 4 });
  });
});
