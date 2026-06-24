// Gerador determinístico de conteúdo SEO para imóveis.
// Nunca inventa dados — usa apenas campos estruturados já validados.

export type SeoSource = {
  property_type: string | null;
  purpose: string | null; // "rent" | "sale" | "both"
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  condominium_name: string | null;
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
  description?: string | null;
  internal_code?: string | null;
};

const cap = (s: string) =>
  s.toLowerCase().replace(/(^|\s|-|\/)([a-zà-ÿ])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());

const fmtBRL = (n: number | null | undefined) =>
  n == null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(Number(n));

const fmtArea = (n: number | null | undefined) => (n == null ? null : `${Number(n).toLocaleString("pt-BR")} m²`);

function purposeLabel(purpose: string | null): { action: string; noun: string } {
  if (purpose === "rent") return { action: "para locação", noun: "Locação" };
  if (purpose === "sale") return { action: "à venda", noun: "Venda" };
  if (purpose === "both") return { action: "para venda ou locação", noun: "Venda/Locação" };
  return { action: "disponível", noun: "Imóvel" };
}

function typeLabel(t: string | null): string {
  if (!t) return "Imóvel";
  const k = t.toLowerCase().trim();
  const map: Record<string, string> = {
    apartamento: "Apartamento", casa: "Casa", cobertura: "Cobertura",
    sobrado: "Sobrado", terreno: "Terreno", flat: "Flat", sala: "Sala comercial",
    salão: "Salão comercial", "salao": "Salão comercial",
    loja: "Loja", galpão: "Galpão", "galpao": "Galpão",
    chácara: "Chácara", "chacara": "Chácara", área: "Área", "area": "Área",
    prédio: "Prédio", "predio": "Prédio", ponto: "Ponto comercial",
  };
  return map[k] ?? cap(k);
}

function locationPhrase(s: SeoSource): string {
  const city = s.city ? cap(s.city) : null;
  const nb = s.neighborhood ? cap(s.neighborhood) : null;
  const st = s.state ?? "";
  if (nb && city) return `${nb}, ${city}${st ? `/${st}` : ""}`;
  if (city) return `${city}${st ? `/${st}` : ""}`;
  if (nb) return nb;
  return "Alphaville";
}

export function buildSeoSlug(s: SeoSource, externalRef?: string | null): string {
  const parts: string[] = [];
  if (s.property_type) parts.push(typeLabel(s.property_type));
  const p = purposeLabel(s.purpose);
  if (s.purpose === "rent") parts.push("locacao");
  else if (s.purpose === "sale") parts.push("venda");
  else if (s.purpose === "both") parts.push("venda-locacao");
  else parts.push(p.noun.toLowerCase());
  if (s.condominium_name) parts.push(s.condominium_name);
  else if (s.neighborhood) parts.push(s.neighborhood);
  if (s.city) parts.push(s.city);
  const base = parts.join(" ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 110);
  const tail = externalRef ? `-${externalRef.split("/").filter(Boolean).pop()}` : "";
  return `${base}${tail}`.slice(0, 140).replace(/-+$/g, "");
}

export function buildSeoTitle(s: SeoSource): string {
  const type = typeLabel(s.property_type);
  const p = purposeLabel(s.purpose);
  const condo = s.condominium_name ? ` no ${cap(s.condominium_name)}` : "";
  const loc = s.neighborhood
    ? ` em ${cap(s.neighborhood)}${s.city && s.neighborhood.toLowerCase() !== s.city.toLowerCase() ? `, ${cap(s.city)}` : ""}`
    : s.city ? ` em ${cap(s.city)}` : "";
  return `${type} ${p.action}${condo}${loc} | S.A Imóveis`.replace(/\s+/g, " ").slice(0, 160);
}

export function buildSeoDescription(s: SeoSource): string {
  const type = typeLabel(s.property_type);
  const p = purposeLabel(s.purpose);
  const loc = locationPhrase(s);
  const parts: string[] = [];
  parts.push(`${type} ${p.action}${s.condominium_name ? ` no condomínio ${cap(s.condominium_name)}` : ""} em ${loc}.`);
  const feats: string[] = [];
  const area = fmtArea(s.area_useful ?? s.area_built ?? s.area_total);
  if (area) feats.push(area);
  if (s.bedrooms) feats.push(`${s.bedrooms} ${s.bedrooms === 1 ? "dormitório" : "dormitórios"}`);
  if (s.suites) feats.push(`${s.suites} ${s.suites === 1 ? "suíte" : "suítes"}`);
  if (s.parking) feats.push(`${s.parking} ${s.parking === 1 ? "vaga" : "vagas"}`);
  if (feats.length) parts.push(feats.join(", ") + ".");
  if (s.price_rent) parts.push(`Locação ${fmtBRL(s.price_rent)}.`);
  if (s.price_sale) parts.push(`Venda ${fmtBRL(s.price_sale)}.`);
  parts.push("Consulte a S.A Imóveis.");
  return parts.join(" ").replace(/\s+/g, " ").slice(0, 300);
}

// Lista controlada de características — só entram na descrição SEO se forem
// detectadas na descrição original ou nos campos estruturados. Nada de inventar.
const FEATURE_PATTERNS: { key: string; label: string; re: RegExp }[] = [
  { key: "piscina", label: "piscina", re: /\bpiscinas?\b/i },
  { key: "churrasqueira", label: "churrasqueira", re: /\bchurrasqueiras?\b/i },
  { key: "escritorio", label: "escritório", re: /\bescrit[oó]rios?\b/i },
  { key: "closet", label: "closet", re: /\bclosets?\b/i },
  { key: "hidromassagem", label: "hidromassagem", re: /\bhidromassagens?\b|\bhidro\b/i },
  { key: "varanda_gourmet", label: "varanda gourmet", re: /\bvarandas?\s+gourmet\b/i },
  { key: "varanda", label: "varanda", re: /\bvarandas?\b(?!\s+gourmet)/i },
  { key: "elevador", label: "elevador", re: /\belevadores?\b/i },
  { key: "mezanino", label: "mezanino", re: /\bmezaninos?\b/i },
  { key: "deposito", label: "depósito", re: /\bdep[oó]sitos?\b/i },
  { key: "ar_condicionado", label: "ar-condicionado", re: /\bar[\s-]?condicionad[oa]s?\b/i },
  { key: "armarios", label: "armários planejados", re: /\barm[aá]rios?\s+planejad[oa]s?\b/i },
  { key: "area_gourmet", label: "área gourmet", re: /\b[aá]rea\s+gourmet\b/i },
  { key: "espaco_gourmet", label: "espaço gourmet", re: /\bespa[cç]o\s+gourmet\b/i },
  { key: "sauna", label: "sauna", re: /\bsaunas?\b/i },
  { key: "lareira", label: "lareira", re: /\blareiras?\b/i },
  { key: "home_theater", label: "home theater", re: /\bhome\s*theater\b/i },
  { key: "adega", label: "adega", re: /\badegas?\b/i },
  { key: "salao_festas", label: "salão de festas", re: /\bsal[aã]o\s+de\s+festas\b/i },
  { key: "academia", label: "academia", re: /\bacademias?\b|\bfitness\b/i },
  { key: "brinquedoteca", label: "brinquedoteca", re: /\bbrinquedotecas?\b/i },
  { key: "quadra", label: "quadra", re: /\bquadras?\b/i },
  { key: "jardim", label: "jardim", re: /\bjardins?\b/i },
  { key: "quintal", label: "quintal", re: /\bquintal\b/i },
  { key: "lavabo", label: "lavabo", re: /\blavabos?\b/i },
  { key: "dep_empregada", label: "dependência de empregada", re: /\bdepend[eê]ncia\s+(?:de\s+)?empregad[oa]\b/i },
  { key: "suite_master", label: "suíte master", re: /\bsu[ií]te\s+master\b/i },
  { key: "andar_alto", label: "andar alto", re: /\bandar\s+alto\b/i },
];

export function extractFeatures(text: string | null | undefined): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of FEATURE_PATTERNS) {
    if (f.re.test(text) && !seen.has(f.label)) {
      seen.add(f.label);
      out.push(f.label);
    }
  }
  return out;
}

function detectFloors(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.match(/(\d+)\s*(?:andares?|pavimentos?|pisos?)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 && n < 100 ? n : null;
}

const BANNED_PHRASES = [
  /\bexcelente\s+oportunidade\b/gi,
  /\blocaliza[cç][aã]o\s+privilegiada\b/gi,
  /\bregi[aã]o\s+consolidada\b/gi,
  /\b[oó]tima\s+op[cç][aã]o\b/gi,
  /\binfraestrutura\s+completa\b/gi,
  /\bim[oó]vel\s+diferenciado\b/gi,
  /\bideal\s+para\b/gi,
  /\bperfeito\s+para\b/gi,
  /\bexcelente\s+escolha\b/gi,
  /\boportunidade\s+[uú]nica\b/gi,
];

export function stripMarketing(text: string): string {
  let out = text;
  for (const re of BANNED_PHRASES) out = out.replace(re, "");
  return out.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
}

/**
 * Descrição SEO em 3 parágrafos. Apenas fatos. Metragem e localização obrigatórias.
 *  P1: tipo + finalidade + localização + metragem
 *  P2: características (dorms/suítes/banheiros/vagas + features detectadas)
 *  P3: valores (locação/venda/condomínio/IPTU)
 */
export function buildSeoBody(s: SeoSource, openingParagraph?: string | null): string {
  const type = typeLabel(s.property_type);
  const p = purposeLabel(s.purpose);
  const city = s.city ? cap(s.city) : null;
  const condo = s.condominium_name ? cap(s.condominium_name) : null;
  const nb = s.neighborhood ? cap(s.neighborhood) : null;

  const locBits: string[] = [];
  if (condo) locBits.push(`no condomínio ${condo}`);
  if (nb && nb.toLowerCase() !== (condo ?? "").toLowerCase()) locBits.push(condo ? `bairro ${nb}` : `em ${nb}`);
  if (city) locBits.push(`em ${city}${s.state ? `/${s.state}` : ""}`);
  const loc = locBits.join(", ");

  const areaBits: string[] = [];
  if (s.area_useful != null) areaBits.push(`área útil de ${fmtArea(s.area_useful)}`);
  if (s.area_built != null) areaBits.push(`área construída de ${fmtArea(s.area_built)}`);
  if (s.area_total != null) areaBits.push(`área total de ${fmtArea(s.area_total)}`);
  const areaPhrase = areaBits.length ? `, com ${areaBits.join(" e ")}` : "";

  let p1: string;
  const aiOpening = openingParagraph ? stripMarketing(openingParagraph) : "";
  if (aiOpening && aiOpening.length > 40) {
    const hasArea = /m[²2]/i.test(aiOpening);
    p1 = hasArea || !areaBits.length ? aiOpening : `${aiOpening.replace(/[.!]?\s*$/, "")}${areaPhrase}.`;
  } else {
    p1 = `${type} ${p.action}${loc ? ` ${loc}` : ""}${areaPhrase}.`;
  }

  const charBits: string[] = [];
  if (s.bedrooms) charBits.push(`${s.bedrooms} ${s.bedrooms === 1 ? "dormitório" : "dormitórios"}`);
  if (s.suites) charBits.push(`${s.suites} ${s.suites === 1 ? "suíte" : "suítes"}`);
  if (s.bathrooms) charBits.push(`${s.bathrooms} ${s.bathrooms === 1 ? "banheiro" : "banheiros"}`);
  if (s.lavabos) charBits.push(`${s.lavabos} ${s.lavabos === 1 ? "lavabo" : "lavabos"}`);
  if (s.parking) {
    const c = s.parking_covered ?? 0;
    const u = s.parking_uncovered ?? 0;
    const detail = c || u
      ? ` (${[c ? `${c} ${c === 1 ? "coberta" : "cobertas"}` : null, u ? `${u} ${u === 1 ? "descoberta" : "descobertas"}` : null].filter(Boolean).join(" + ")})`
      : "";
    charBits.push(`${s.parking} ${s.parking === 1 ? "vaga" : "vagas"}${detail}`);
  }
  const floors = detectFloors(s.description);
  if (floors) charBits.push(`${floors} ${floors === 1 ? "andar" : "andares"}`);
  const features = extractFeatures(s.description);
  for (const f of features) charBits.push(f);

  let p2 = "";
  if (charBits.length === 1) {
    p2 = `O imóvel possui ${charBits[0]}.`;
  } else if (charBits.length > 1) {
    p2 = `O imóvel possui ${charBits.slice(0, -1).join(", ")} e ${charBits[charBits.length - 1]}.`;
  }

  const valBits: string[] = [];
  if (s.price_rent != null) valBits.push(`Valor da locação: ${fmtBRL(s.price_rent)}.`);
  if (s.price_sale != null) valBits.push(`Valor de venda: ${fmtBRL(s.price_sale)}.`);
  if (s.condo_fee != null) valBits.push(`Condomínio: ${fmtBRL(s.condo_fee)}.`);
  if (s.iptu != null) valBits.push(`IPTU: ${fmtBRL(s.iptu)}.`);
  const p3 = valBits.join(" ");

  return [p1, p2, p3].filter(Boolean).join("\n\n");
}

/**
 * Valida que a descrição SEO não introduz números que contradigam os campos
 * estruturados. Retorna lista de issues — vazio = OK.
 */
export function auditSeoConsistency(s: SeoSource, seoText: string | null | undefined): string[] {
  const issues: string[] = [];
  if (!seoText) return issues;
  const txt = seoText.toLowerCase();

  type Rule = { label: string; value: number | null; re: RegExp };
  const rules: Rule[] = [
    { label: "dormitórios", value: s.bedrooms, re: /(\d+)\s*(?:dormit[oó]rios?|quartos?)/gi },
    { label: "suítes", value: s.suites, re: /(\d+)\s*su[ií]tes?/gi },
    { label: "banheiros", value: s.bathrooms, re: /(\d+)\s*banheiros?/gi },
    { label: "lavabos", value: s.lavabos, re: /(\d+)\s*lavabos?/gi },
  ];
  for (const r of rules) {
    const matches = Array.from(txt.matchAll(r.re)).map((m) => parseInt(m[1], 10));
    if (!matches.length) continue;
    if (r.value == null) {
      issues.push(`SEO menciona ${r.label} (${matches.join(",")}) mas campo estruturado está vazio`);
    } else if (!matches.includes(r.value)) {
      issues.push(`SEO diz ${matches.join(",")} ${r.label}, estruturado=${r.value}`);
    }
  }
  return issues;
}

/** Avalia auditoria geral do imóvel — usado pelo painel. */
export function auditProperty(s: SeoSource & { descricao_seo?: string | null }): {
  status: "ok" | "review" | "error";
  issues: string[];
} {
  const issues: string[] = [];
  if (!s.property_type) issues.push("Sem tipo de imóvel");
  if (!s.city) issues.push("Sem cidade");
  if (!s.condominium_name) issues.push("Sem condomínio");
  if (!s.bedrooms) issues.push("Sem dormitórios");
  if (s.area_useful == null && s.area_built == null && s.area_total == null) issues.push("Sem metragem");
  if (!s.price_rent && !s.price_sale) issues.push("Sem valor");
  issues.push(...auditSeoConsistency(s, s.descricao_seo));
  const hasNumberConflict = issues.some((i) => i.startsWith("SEO diz"));
  if (hasNumberConflict) return { status: "error", issues };
  if (issues.length === 0) return { status: "ok", issues };
  return { status: "review", issues };
}

export function buildRealEstateJsonLd(s: SeoSource, opts: { url: string; title: string; description: string; image?: string | null }) {
  const offerType = s.purpose === "rent" ? "RentAction" : "Offer";
  const price = s.price_rent ?? s.price_sale;
  const json: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: opts.title,
    description: opts.description,
    url: opts.url,
    datePosted: new Date().toISOString(),
  };
  if (opts.image) json.image = opts.image;
  const area = s.area_useful ?? s.area_built ?? s.area_total;
  if (area) json.floorSize = { "@type": "QuantitativeValue", value: area, unitCode: "MTK" };
  if (s.bedrooms) json.numberOfBedrooms = s.bedrooms;
  if (s.bathrooms) json.numberOfBathroomsTotal = s.bathrooms;
  if (price) {
    json.offers = {
      "@type": offerType === "RentAction" ? "Offer" : "Offer",
      price: price,
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      ...(s.purpose === "rent" ? { businessFunction: "http://purl.org/goodrelations/v1#LeaseOut" } : {}),
    };
  }
  if (s.city || s.neighborhood) {
    json.address = {
      "@type": "PostalAddress",
      addressLocality: s.city ? cap(s.city) : undefined,
      addressRegion: s.state ?? undefined,
      addressCountry: "BR",
      ...(s.neighborhood ? { streetAddress: cap(s.neighborhood) } : {}),
    };
  }
  return json;
}

export const seoLabels = { typeLabel, purposeLabel, locationPhrase, cap };
