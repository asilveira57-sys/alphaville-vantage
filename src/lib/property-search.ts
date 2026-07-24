// Motor central de interpretação de busca em linguagem natural.
// Usado tanto pela home quanto pela página /imoveis para garantir
// uma única lógica de parsing de frases como
// "casa 4 quartos em Santana de Parnaíba até 2 milhões".

export type InterpretedFilters = {
  purpose?: "sale" | "rent" | "both";
  type?: string;
  city?: string;
  neighborhood?: string;
  bedrooms?: number;
  parking?: number;
  priceMax?: number;
  q?: string; // frase original preservada como contexto textual
};

const TYPE_MAP: Record<string, string> = {
  apartamento: "apartamento", apto: "apartamento", ap: "apartamento",
  cobertura: "apartamento",
  casa: "casa", sobrado: "casa",
  terreno: "terreno", lote: "terreno",
  sala: "sala", conjunto: "sala",
  loja: "loja",
  galpao: "galpão", galpão: "galpão",
  predio: "prédio", prédio: "prédio",
  flat: "apartamento",
};

// Cidades canônicas conhecidas do portfólio.
const CITIES: { canon: string; keys: string[] }[] = [
  { canon: "Barueri", keys: ["barueri"] },
  { canon: "Santana de Parnaíba", keys: ["santana de parnaiba", "santana de parnaíba", "parnaiba", "parnaíba"] },
  { canon: "Osasco", keys: ["osasco"] },
  { canon: "São Paulo", keys: ["sao paulo", "são paulo", "sp capital"] },
];

// Bairros / regiões canônicas.
const NEIGHBORHOODS: { canon: string; keys: string[] }[] = [
  { canon: "Alphaville", keys: ["alphaville"] },
  { canon: "Tamboré", keys: ["tambore", "tamboré"] },
  { canon: "Aldeia da Serra", keys: ["aldeia da serra"] },
  { canon: "Genesis", keys: ["genesis", "gênesis"] },
  { canon: "Melville", keys: ["melville"] },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function parsePriceMax(text: string): number | undefined {
  // "ate 2 milhoes", "até 2 mi", "até 1,5m", "ate 800 mil", "R$ 1.200.000"
  const t = norm(text);
  let m = t.match(/at[eé]?\s*r?\$?\s*([\d.,]+)\s*(milh[oõ]es?|milhao|mi|m)\b/);
  if (m) {
    const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(n)) return Math.round(n * 1_000_000);
  }
  m = t.match(/at[eé]?\s*r?\$?\s*([\d.,]+)\s*mil\b/);
  if (m) {
    const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(n)) return Math.round(n * 1_000);
  }
  m = t.match(/at[eé]?\s*r?\$\s*([\d\.]+)/);
  if (m) {
    const n = parseInt(m[1].replace(/\./g, ""), 10);
    if (Number.isFinite(n) && n > 100) return n;
  }
  return undefined;
}

export function interpretQuery(raw: string): InterpretedFilters {
  const result: InterpretedFilters = {};
  const original = (raw ?? "").trim();
  if (!original) return result;
  result.q = original;
  const t = ` ${norm(original)} `;

  // Finalidade
  if (/\b(alug(uel|ar|a)|loca[cç][aã]o|para\s+alugar)\b/.test(t)) result.purpose = "rent";
  else if (/\b(venda|comprar|à\s+venda|a\s+venda|vender)\b/.test(t)) result.purpose = "sale";

  // Tipo
  for (const [k, v] of Object.entries(TYPE_MAP)) {
    const re = new RegExp(`\\b${k}s?\\b`, "i");
    if (re.test(t)) { result.type = v; break; }
  }

  // Cidade
  for (const c of CITIES) {
    if (c.keys.some((k) => t.includes(` ${k} `) || t.includes(` em ${k} `))) {
      result.city = c.canon; break;
    }
  }

  // Bairro
  for (const b of NEIGHBORHOODS) {
    if (b.keys.some((k) => t.includes(` ${k} `))) {
      result.neighborhood = b.canon; break;
    }
  }

  // Dormitórios / quartos / suítes
  const bed = t.match(/(\d+)\s*(quartos?|dormit[oó]rios?|dorm\.?|su[ií]tes?)/);
  if (bed) {
    const n = parseInt(bed[1], 10);
    if (Number.isFinite(n) && n > 0 && n < 20) result.bedrooms = n;
  }

  // Vagas
  const park = t.match(/(\d+)\s*vagas?/);
  if (park) {
    const n = parseInt(park[1], 10);
    if (Number.isFinite(n) && n > 0 && n < 20) result.parking = n;
  }

  // Preço máximo
  const pmax = parsePriceMax(original);
  if (pmax) result.priceMax = pmax;

  return result;
}

// Converte a interpretação em objeto de search params compatível com a rota /imoveis.
export function toImoveisSearchParams(
  parsed: InterpretedFilters,
  overrides?: { purpose?: string; city?: string },
): Record<string, string | number> {
  return {
    purpose: overrides?.purpose ?? parsed.purpose ?? "",
    type: parsed.type ?? "",
    city: overrides?.city ?? parsed.city ?? "",
    neighborhood: parsed.neighborhood ?? "",
    condo: "",
    bedrooms: parsed.bedrooms ?? 0,
    parking: parsed.parking ?? 0,
    priceMin: 0,
    priceMax: parsed.priceMax ?? 0,
    areaMin: 0,
    sort: "recent",
    q: parsed.q ?? "",
    page: 1,
  };
}
