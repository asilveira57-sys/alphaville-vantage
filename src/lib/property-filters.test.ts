import { describe, it, expect } from "vitest";
import { canonicalNumWords, residualLocationQuery } from "./property-search";
import { maskBrlInput, parseBrlInput } from "./property-listing";
import { effectiveSearch, toRpcArgs, IMOVEIS_DEFAULTS } from "./property-query";
import { resolveCondoTokens } from "./property-search.functions";

describe("canonicalNumWords — equivalência 1/I/Um em condomínios", () => {
  it("converte palavras e algarismos romanos em dígitos", () => {
    expect(canonicalNumWords("residencial um")).toBe("residencial 1");
    expect(canonicalNumWords("residencial i")).toBe("residencial 1");
    expect(canonicalNumWords("alphaville ii")).toBe("alphaville 2");
    expect(canonicalNumWords("tamboré iii")).toBe("tamboré 3");
    expect(canonicalNumWords("residencial 01")).toBe("residencial 1");
  });
  it("não altera números maiores nem texto comum", () => {
    expect(canonicalNumWords("residencial 10")).toBe("residencial 10");
    expect(canonicalNumWords("residencial 11")).toBe("residencial 11");
    expect(canonicalNumWords("casa com piscina")).toBe("casa com piscina");
  });
  it("residualLocationQuery mantém o número como palavra inteira", () => {
    expect(residualLocationQuery("residencial 1")).toBe("residencial 1");
    expect(residualLocationQuery("Residencial Um")).toBe("residencial 1");
  });
});

describe("máscara de valor em reais", () => {
  it("formata com separador de milhar e prefixo R$", () => {
    expect(maskBrlInput("1500000")).toBe("R$ 1.500.000");
    expect(maskBrlInput("1500")).toBe("R$ 1.500");
    expect(maskBrlInput("")).toBe("");
    expect(maskBrlInput("abc")).toBe("");
  });
  it("interpreta de volta o valor digitado", () => {
    expect(parseBrlInput("R$ 1.500.000")).toBe(1_500_000);
    expect(parseBrlInput("1500000")).toBe(1_500_000);
    expect(parseBrlInput("")).toBe(0);
  });
});

describe("min/max na URL com compatibilidade legada", () => {
  it("min/max novos têm prioridade sobre priceMin/priceMax antigos", () => {
    const s = effectiveSearch({ ...IMOVEIS_DEFAULTS, min: 1_000_000, max: 2_000_000, priceMin: 500_000 });
    expect(s.priceMin).toBe(1_000_000);
    expect(s.priceMax).toBe(2_000_000);
  });
  it("links antigos com priceMin/priceMax continuam funcionando", () => {
    const s = effectiveSearch({ ...IMOVEIS_DEFAULTS, priceMin: 500_000, priceMax: 900_000 });
    expect(s.priceMin).toBe(500_000);
    expect(s.priceMax).toBe(900_000);
  });
});

describe("resolveCondoTokens — match exato pela Central de Condomínios", () => {
  const rows = [
    { id: "id-1", name: "Residencial 1", slug: "residencial-1" },
    { id: "id-2", name: "Residencial 2", slug: "residencial-2" },
    { id: "id-10", name: "Residencial 10", slug: "residencial-10" },
    { id: "id-b", name: "Bellagio", slug: "bellagio" },
  ];
  it("resolve slugs separados por vírgula", () => {
    expect(resolveCondoTokens("residencial-1,residencial-2", rows)).toEqual(["id-1", "id-2"]);
  });
  it("slug residencial-1 não casa com Residencial 10", () => {
    expect(resolveCondoTokens("residencial-1", rows)).toEqual(["id-1"]);
  });
  it("link antigo com nome (?condo=Bellagio) continua funcionando", () => {
    expect(resolveCondoTokens("Bellagio", rows)).toEqual(["id-b"]);
  });
  it("token desconhecido não gera id (cai no caminho textual legado)", () => {
    expect(resolveCondoTokens("condominio inexistente", rows)).toEqual([]);
  });
});

describe("toRpcArgs com condoIds", () => {
  it("usa p_condo_ids e limpa o texto quando há ids", () => {
    const args = toRpcArgs({ ...IMOVEIS_DEFAULTS, condo: "residencial-1,residencial-2" }, 15, 0, ["id-1", "id-2"]);
    expect(args.p_condo_ids).toEqual(["id-1", "id-2"]);
    expect(args.p_condo).toBe("");
  });
  it("mantém o texto legado quando nada resolveu", () => {
    const args = toRpcArgs({ ...IMOVEIS_DEFAULTS, condo: "Life Park" }, 15, 0, []);
    expect(args.p_condo_ids).toBeUndefined();
    expect(args.p_condo).toBe("Life Park");
  });
});
