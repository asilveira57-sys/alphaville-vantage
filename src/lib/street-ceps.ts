/** CEPs oficiais (Correios, via ViaCEP) gravados em streets.ceps. tipo "geral" = CEP da rua ou de um trecho; "numero" = CEP próprio de um prédio/empresa. */
export type StreetCep = {
  cep: string;
  logradouro: string;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  tipo: "geral" | "numero";
};

export function parseCeps(v: unknown): StreetCep[] {
  return Array.isArray(v) ? (v as StreetCep[]).filter((c) => c && typeof c.cep === "string") : [];
}

export const cleanBairro = (b: string | null | undefined) => (b ?? "").replace(/\.$/, "").replace(/\/Alphaville$/, "");

export function areaShort(neighborhood?: string | null, city?: string | null) {
  const n = neighborhood ?? "";
  if (/tambor/i.test(n)) return "Tamboré";
  if (/alpha|green valley|melville|18 do forte|dezoito/i.test(n)) return "Alphaville";
  return n || city || "Alphaville";
}

/** "06465-134" ou "06473-073 e 06473-075" ou "06454-020 e outros" */
export function cepLabel(ceps: StreetCep[]) {
  const g = ceps.filter((c) => c.tipo === "geral").map((c) => c.cep);
  if (g.length === 0) return null;
  if (g.length === 1) return g[0];
  if (g.length === 2) return `${g[0]} e ${g[1]}`;
  return `${g[0]} e outros`;
}

function trecho(c: StreetCep) {
  const parts = [c.complemento && !/^(polo|green|g[eê]nesis|alphas)/i.test(c.complemento) ? c.complemento : null, cleanBairro(c.bairro), c.cidade].filter(Boolean);
  return parts.join(", ");
}

export function cepFaq(name: string, ceps: StreetCep[]) {
  const g = ceps.filter((c) => c.tipo === "geral");
  if (g.length === 0) return [];
  const answer =
    g.length === 1
      ? `O CEP da ${name} é ${g[0].cep} (${trecho(g[0])}).`
      : `A ${name} tem mais de um CEP: ${g.map((c) => `${c.cep} (${trecho(c)})`).join("; ")}.`;
  const n = ceps.filter((c) => c.tipo === "numero").length;
  return [{
    question: `Qual é o CEP da ${name}?`,
    answer: n > 0 ? `${answer} Alguns prédios e empresas da via têm CEP próprio, listado na página.` : answer,
  }];
}
