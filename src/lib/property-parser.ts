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
  lavabos: number | null;
  parking: number | null;
  parking_covered: number | null;
  parking_uncovered: number | null;
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
  const cleaned = raw.replace(/[^\d,.\-]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned.replace(/\.(?=\d{3}(?:[.,]|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function pickMoney(text: string, labels: RegExp): number | null {
  const m = text.match(labels);
  if (!m) return null;
  return parseMoney(m[1]);
}

function pickArea(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Itera todas as ocorrências de um número seguido de label e devolve o MAIOR.
 * Usado p/ banheiros/dormitórios: o sumário do anúncio (5 banheiros) vence
 * referências incidentais (1 banheiro compartilhado). */
function pickMaxInt(text: string, re: RegExp): number | null {
  const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  const r = new RegExp(re.source, flags);
  let max: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = r.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && (max == null || n > max)) max = n;
  }
  return max;
}

function detectType(text: string): string | null {
  const n = norm(text);
  for (const t of TYPES) {
    const re = new RegExp(`\\b${t.replace(/[áéíóúãâ]/g, ".")}\\b`, "i");
    if (re.test(n)) {
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
  const re = new RegExp(`([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\\wÀ-ÿ\\s\\.]{2,50}?)\\s*[-/]\\s*(${STATES.join("|")})\\b`);
  const m = text.match(re);
  if (m) {
    return { city: m[1].trim().replace(/\s+/g, " "), state: m[2].toUpperCase() };
  }
  return { city: null, state: null };
}

function detectCondoFromTitle(title: string): string | null {
  const patterns = [
    /\b(Tambor[eé]\s*\d+(?:\s*Alphaville)?)/i,
    /\b(Alphaville\s+[A-ZÁÉÍÓÚÂÊÔÃ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃ][\wÀ-ÿ]+){0,3})/,
    /\b(Residencial\s+[A-ZÁÉÍÓÚÂÊÔÃ0-9][\wÀ-ÿ]*(?:\s+[A-ZÁÉÍÓÚÂÊÔÃ0-9][\wÀ-ÿ]*){0,3})/,
    /\b(Condom[ií]nio\s+[A-ZÁÉÍÓÚÂÊÔÃ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃ][\wÀ-ÿ]+){0,3})/i,
  ];
  for (const re of patterns) {
    const m = title.match(re);
    if (m) return m[1].trim().replace(/\s+/g, " ");
  }
  return null;
}

function detectNeighborhood(text: string): string | null {
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

/** Extrai vagas com breakdown coberto/descoberto se mencionado. */
function detectParking(text: string): { total: number | null; covered: number | null; uncovered: number | null } {
  // "2 vagas (de garagem)? cobertas e 2 descobertas"
  const both = text.match(/(\d+)\s*vagas?(?:\s+(?:de\s+)?garagem)?\s+cobertas?\s+e\s+(\d+)\s+descobertas?/i)
    ?? text.match(/(\d+)\s*cobertas?\s+e\s+(\d+)\s+descobertas?/i);
  if (both) {
    const c = parseInt(both[1], 10);
    const u = parseInt(both[2], 10);
    return { covered: c, uncovered: u, total: c + u };
  }
  const covered = pickMaxInt(text, /(\d+)\s*vagas?(?:\s+(?:de\s+)?garagem)?\s+cobertas?\b/i);
  const uncovered = pickMaxInt(text, /(\d+)\s*vagas?\s+descobertas?\b/i);
  if (covered != null || uncovered != null) {
    return { covered, uncovered, total: (covered ?? 0) + (uncovered ?? 0) };
  }
  const total = pickMaxInt(text, /(\d+)\s*(?:vagas?|garagens?|garagem)\b/i);
  return { total, covered: null, uncovered: null };
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
  if (!property_type && url) {
    try {
      const segs = new URL(url).pathname.split("/").filter(Boolean);
      if (segs[1]) property_type = detectType(segs[1].replace(/-/g, " "));
    } catch { /* ignore */ }
  }

  const { city, state } = detectCityState(combined);
  const neighborhood = detectNeighborhood(combined);
  const condominium_name = detectCondoFromTitle(title) ?? detectCondoFromTitle(desc);

  // Áreas — AT/AC/AU + variantes por extenso (rótulo antes OU depois do número).
  // [\s\S]{0,30}? cobre whitespace/quebras de linha vindos da tabelinha lateral,
  // onde o rótulo e o número às vezes ficam em células/linhas separadas.
  const area_total = pickArea(n, /\bat\s*([\d.,]+)\s*m[²2]/i)
    ?? pickArea(combined, /[áa]rea\s+(?:do\s+)?terreno[\s\S]{0,30}?([\d.,]+)\s*m[²2]/i)
    ?? pickArea(combined, /[áa]rea\s+total[\s\S]{0,30}?([\d.,]+)\s*m[²2]/i)
    ?? pickArea(combined, /([\d.,]+)\s*m[²2]\s*(?:de\s+)?(?:terreno|total|[áa]rea\s+total)\b/i);
  const area_built = pickArea(n, /\bac\s*([\d.,]+)\s*m[²2]/i)
    ?? pickArea(combined, /[áa]rea\s+constru[ií]da[\s\S]{0,30}?([\d.,]+)\s*m[²2]/i)
    ?? pickArea(combined, /([\d.,]+)\s*m[²2]\s*(?:de\s+)?(?:constru[ií]da|[áa]rea\s+constru[ií]da)\b/i);
  let area_useful = pickArea(n, /\bau\s*([\d.,]+)\s*m[²2]/i)
    ?? pickArea(combined, /[áa]rea\s+[uú]til(?:\s*\/\s*privativ[ao])?[\s\S]{0,30}?([\d.,]+)\s*m[²2]/i)
    ?? pickArea(combined, /[áa]rea\s+privativa[\s\S]{0,30}?([\d.,]+)\s*m[²2]/i)
    ?? pickArea(combined, /([\d.,]+)\s*m[²2]\s*(?:de\s+)?(?:[úu]til|privativ[ao]|[áa]rea\s+[úu]til|[áa]rea\s+privativa)\b/i);

  // Fallback — metragem solta sem rótulo (ex.: "50 m2" na descrição).
  // Só usa se nenhum dos três campos rotulados foi preenchido, e ignora valores
  // absurdos (< 10 ou > 10.000) para descartar ruído.
  if (area_useful == null && area_built == null && area_total == null) {
    const re = /(\d{2,5}(?:[.,]\d{1,2})?)\s*m[²2]\b/gi;
    let best: number | null = null;
    let m: RegExpExecArray | null;
    while ((m = re.exec(combined)) !== null) {
      const n2 = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(n2) || n2 < 10 || n2 > 10_000) continue;
      if (best == null || n2 > best) best = n2;
    }
    if (best != null) area_useful = best;
  }

  // Dormitórios / suítes / banheiros / lavabos — usa MAX p/ vencer menções
  // incidentais como "1 banheiro compartilhado".
  const bedrooms = pickMaxInt(combined, /(\d+)\s*(?:quartos?|dormit[oó]rios?|dorm\.?)\b/i);
  const suites = pickMaxInt(combined, /(\d+)\s*su[ií]tes?\b/i);
  // Banheiros: exclui "X lavabos" e "X suítes"; pega só "N banheiros" puro.
  const bathrooms = pickMaxInt(combined, /(\d+)\s*banheiros?(?!\s+(?:compartilhad))/i);
  // Lavabos
  let lavabos: number | null = pickMaxInt(combined, /(\d+)\s*lavabos?\b/i);
  if (lavabos == null && /\blavabo\b/i.test(combined)) lavabos = 1;

  const parkingInfo = detectParking(combined);

  // Valores
  // Aluguel: cascata 1) "aluguel total R$ X"; 2) "aluguel R$ X/m²" * área;
  // 3) "aluguel R$ X" puro (negative lookahead p/ não casar "/m²").
  let price_rent: number | null = pickMoney(
    combined,
    /(?:valor\s+)?(?:aluguel|loca[cç][aã]o)\s+total[^R$]{0,30}R\$\s*([\d.,]+)/i,
  );
  const rent_per_m2 = pickMoney(
    combined,
    /(?:valor\s+)?(?:aluguel|loca[cç][aã]o)[^R$]{0,30}R\$\s*([\d.,]+)\s*\/\s*m[²2]/i,
  );
  if (price_rent == null && rent_per_m2 != null) {
    const area = area_total ?? area_built ?? area_useful;
    if (area && area >= 10) price_rent = Math.round(rent_per_m2 * area);
  }
  if (price_rent == null) {
    price_rent = pickMoney(
      combined,
      /(?:valor\s+)?(?:aluguel|loca[cç][aã]o)[^R$]{0,30}R\$\s*([\d.,]+)(?![\d.,])(?!\s*\/?\s*m[²2])/i,
    );
  }
  // Sanidade: aluguel < R$ 100 é quase certamente um "/m²" que escapou.
  if (price_rent != null && price_rent < 100) price_rent = null;
  const price_sale = pickMoney(combined, /(?:valor\s+)?(?:venda|compra)[^R$]{0,30}R\$\s*([\d.,]+)/i);
  const condo_fee = pickMoney(combined, /condom[ií]nio[^R$]{0,30}R\$\s*([\d.,]+)/i);
  const iptu = pickMoney(combined, /\biptu\b[^R$]{0,30}R\$\s*([\d.,]+)/i);

  // Booleans — regras estritas, sem adivinhação
  const furnished = /\bmobiliad[oa]\b/i.test(combined)
    ? true
    : (/\bsem\s+mob[ií]lia\b|\bn[ãa]o\s+mobiliad/i.test(combined) ? false : null);
  // is_launch: exige termo explícito de marketing imobiliário, não a palavra
  // solta "lançamento" em qualquer contexto.
  const is_launch = /\blan[çc]amento\s+(?:imobili[áa]rio|do\s+empreendimento)\b|\bempreendimento\s+em\s+lan[çc]amento\b|\bbreve\s+lan[çc]amento\b/i.test(combined)
    ? true
    : null;
  const accepts_exchange = /\b(?:aceita\s+permuta|permuta\s+por|permuta-se|estuda\s+permuta)\b/i.test(combined) ? true : null;

  const codeMatch = combined.match(/\b(?:c[oó]d(?:igo)?\.?|ref(?:er[eê]ncia)?\.?)\s*:?\s*([A-Z0-9\-]{3,20})\b/i);
  const internal_code = codeMatch ? codeMatch[1] : null;

  return {
    city, state, neighborhood, condominium_name, property_type,
    bedrooms, suites, bathrooms, lavabos,
    parking: parkingInfo.total,
    parking_covered: parkingInfo.covered,
    parking_uncovered: parkingInfo.uncovered,
    area_useful, area_built, area_total,
    price_sale, price_rent, condo_fee, iptu,
    furnished, is_launch, accepts_exchange,
    internal_code,
  };
}

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

/** Capitaliza primeira letra após ponto/quebra, preservando o resto. */
export function humanizeOriginalDescription(raw: string | null | undefined): string {
  if (!raw) return "";
  // Normaliza espaços múltiplos mas preserva quebras de linha
  let s = raw.replace(/[ \t]+/g, " ").trim();
  // Insere quebras antes de blocos comerciais comuns
  s = s.replace(/\s*(valor\s+(?:aluguel|venda|loca[cç][aã]o))/gi, "\n\n$1");
  s = s.replace(/\s*(condom[ií]nio\s+r\$)/gi, "\n$1");
  s = s.replace(/\s*(\biptu\b\s+r\$)/gi, "\n$1");
  // Capitaliza início de cada frase
  s = s.replace(/(^|[.!?]\s+|\n+)([a-záàâãéêíóôõúç])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
  // Capitaliza "r$" → "R$"
  s = s.replace(/\br\$/g, "R$");
  return s;
}
