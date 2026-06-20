// Parser determinístico para extrair campos estruturados da descrição/título
// de imóveis vindos do scrap. Não inventa dados: só preenche quando há match
// confiável no texto.

export type ParsedProperty = {
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  condominium_name: string | null;
  property_type: string | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parking: number | null;
  area_useful: number | null;
  area_built: number | null;
  area_total: number | null;
  price_sale: number | null;
  price_rent: number | null;
  condo_fee: number | null;
  iptu: number | null;
  furnished: boolean | null;
  is_launch: boolean | null;
  accepts_exchange: boolean | null;
  internal_code: string | null;
};

const TYPES = [
  "apartamento", "área", "area", "casa", "chácara", "chacara",
  "galpão", "galpao", "loja", "ponto", "prédio", "predio",
  "sala", "salão", "salao", "terreno", "cobertura", "sobrado", "flat",
];

const STATES = ["SP", "RJ", "MG", "PR", "SC", "RS", "BA", "DF", "GO", "ES", "MS", "MT"];

function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function parseMoney(raw: string): number | null {
  // "R$ 50.000,00" → 50000; "R$ 2.236,00" → 2236
  const cleaned = raw.replace(/[^\d,.\-]/g, "");
  if (!cleaned) return null;
  // remove thousands "." then convert "," to "."
  const n = parseFloat(cleaned.replace(/\.(?=\d{3}(?:[.,]|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function pickMoney(text: string, labels: RegExp): number | null {
  const m = text.match(labels);
  if (!m) return null;
  return parseMoney(m[1]);
}

function pickInt(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

function pickArea(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function detectType(text: string): string | null {
  const n = norm(text);
  for (const t of TYPES) {
    const re = new RegExp(`\\b${t.replace(/[áéíóúãâ]/g, ".")}\\b`, "i");
    if (re.test(n)) {
      // normalizar para o canônico
      if (t === "area") return "área";
      if (t === "chacara") return "chácara";
      if (t === "galpao") return "galpão";
      if (t === "predio") return "prédio";
      if (t === "salao") return "salão";
      return t;
    }
  }
  return null;
}

function detectCityState(text: string): { city: string | null; state: string | null } {
  // Padrão: "Cidade - SP" ou "Cidade/SP"
  const re = new RegExp(`([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\\wÀ-ÿ\\s\\.]{2,50}?)\\s*[-/]\\s*(${STATES.join("|")})\\b`);
  const m = text.match(re);
  if (m) {
    return { city: m[1].trim().replace(/\s+/g, " "), state: m[2].toUpperCase() };
  }
  return { city: null, state: null };
}

function detectCondoFromTitle(title: string): string | null {
  // Heurística: títulos do tipo "Casa Avenida X Tamborê 11 - Tamboré - Santana de Parnaíba - SP"
  // Procura padrões "Tamboré N", "Alphaville X", "Residencial Y", etc.
  const patterns = [
    /\b(Tambor[eé]\s*\d+(?:\s*Alphaville)?)/i,
    /\b(Alphaville\s+[A-ZÁÉÍÓÚÂÊÔÃ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃ][\wÀ-ÿ]+){0,3})/,
    /\b(Residencial\s+[A-ZÁÉÍÓÚÂÊÔÃ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃ][\wÀ-ÿ]+){0,3})/,
    /\b(Condom[ií]nio\s+[A-ZÁÉÍÓÚÂÊÔÃ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃ][\wÀ-ÿ]+){0,3})/i,
  ];
  for (const re of patterns) {
    const m = title.match(re);
    if (m) return m[1].trim().replace(/\s+/g, " ");
  }
  return null;
}

function detectNeighborhood(text: string): string | null {
  // Bairros conhecidos da região
  const bairros = [
    "Tamboré", "Alphaville", "Aldeia da Serra", "Genesis", "Melville",
    "Granja Viana", "Centro", "Jardins",
  ];
  for (const b of bairros) {
    const re = new RegExp(`\\b${b.replace(/é/g, "[eé]").replace(/ô/g, "[oô]")}\\b`, "i");
    if (re.test(text)) return b;
  }
  return null;
}

export function parsePropertyText(input: {
  title?: string | null;
  description?: string | null;
  url?: string | null;
}): ParsedProperty {
  const title = input.title ?? "";
  const desc = input.description ?? "";
  const url = input.url ?? "";
  const combined = `${title}\n${desc}`;
  const n = norm(combined);

  // Tipo
  let property_type: string | null = detectType(title) ?? detectType(desc);
  // tenta extrair tipo da URL (/alugar/casa/...)
  if (!property_type && url) {
    try {
      const segs = new URL(url).pathname.split("/").filter(Boolean);
      if (segs[1]) property_type = detectType(segs[1].replace(/-/g, " "));
    } catch { /* ignore */ }
  }

  // Cidade / Estado
  const { city, state } = detectCityState(combined);

  // Bairro / Condomínio
  const neighborhood = detectNeighborhood(combined);
  const condominium_name = detectCondoFromTitle(title) ?? detectCondoFromTitle(desc);

  // Áreas: "at 420 m²", "ac 440 m²", "au 200 m²"
  const area_total = pickArea(n, /\bat\s*([\d.,]+)\s*m[²2]/i) ?? pickArea(combined, /[áa]rea\s+total[^0-9]{0,12}([\d.,]+)\s*m[²2]/i);
  const area_built = pickArea(n, /\bac\s*([\d.,]+)\s*m[²2]/i) ?? pickArea(combined, /[áa]rea\s+constru[ií]da[^0-9]{0,12}([\d.,]+)\s*m[²2]/i);
  const area_useful = pickArea(n, /\bau\s*([\d.,]+)\s*m[²2]/i) ?? pickArea(combined, /[áa]rea\s+[uú]til[^0-9]{0,12}([\d.,]+)\s*m[²2]/i);

  // Dormitórios / suítes / vagas / banheiros
  const bedrooms = pickInt(combined, /(\d+)\s*(?:quartos?|dormit[oó]rios?|dorm\.?)\b/i);
  const suites = pickInt(combined, /(\d+)\s*su[ií]tes?\b/i);
  const parking = pickInt(combined, /(\d+)\s*(?:vagas?|garagens?|garagem)\b/i);
  const bathrooms = pickInt(combined, /(\d+)\s*banheiros?\b/i);

  // Valores
  const price_rent = pickMoney(combined, /(?:valor\s+)?(?:aluguel|loca[cç][aã]o)[^R$]{0,30}R\$\s*([\d.,]+)/i);
  const price_sale = pickMoney(combined, /(?:valor\s+)?(?:venda|compra)[^R$]{0,30}R\$\s*([\d.,]+)/i);
  const condo_fee = pickMoney(combined, /condom[ií]nio[^R$]{0,30}R\$\s*([\d.,]+)/i);
  const iptu = pickMoney(combined, /\biptu\b[^R$]{0,30}R\$\s*([\d.,]+)/i);

  // Booleans
  const furnished = /\bmobiliad[oa]\b/i.test(combined) ? true : (/\bsem\s+mob[ií]lia\b|\bn[ãa]o\s+mobiliad/i.test(combined) ? false : null);
  const is_launch = /\blan[çc]amento\b/i.test(combined) ? true : null;
  const accepts_exchange = /\b(?:aceita\s+permuta|permuta\s+por|permuta-se|estuda\s+permuta)\b/i.test(combined) ? true : null;

  // Código interno: tenta achar "Cód.: 12345" ou "Ref. 12345"
  const codeMatch = combined.match(/\b(?:c[oó]d(?:igo)?\.?|ref(?:er[eê]ncia)?\.?)\s*:?\s*([A-Z0-9\-]{3,20})\b/i);
  const internal_code = codeMatch ? codeMatch[1] : null;

  return {
    city, state, neighborhood, condominium_name, property_type,
    bedrooms, suites, bathrooms, parking,
    area_useful, area_built, area_total,
    price_sale, price_rent, condo_fee, iptu,
    furnished, is_launch, accepts_exchange,
    internal_code,
  };
}

// Avalia se um imóvel está com dados completos / incompletos / precisa revisar
export function computeReviewStatus(p: {
  property_type?: string | null;
  city?: string | null;
  bedrooms?: number | null;
  area_useful?: number | null;
  area_built?: number | null;
  area_total?: number | null;
  price_sale?: number | null;
  price_rent?: number | null;
}): "complete" | "incomplete" | "needs_review" {
  const hasPrice = (p.price_sale ?? 0) > 0 || (p.price_rent ?? 0) > 0;
  const hasArea = (p.area_useful ?? 0) > 0 || (p.area_built ?? 0) > 0 || (p.area_total ?? 0) > 0;
  const essentials = [p.property_type, p.city].filter(Boolean).length;
  if (essentials === 2 && hasPrice && hasArea) return "complete";
  if (!hasPrice || !p.property_type) return "incomplete";
  return "needs_review";
}
