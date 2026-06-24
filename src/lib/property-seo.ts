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

/**
 * Descrição SEO completa em duas partes:
 *  PARTE 1 — abertura humanizada (max ~120 palavras), só usa fatos existentes.
 *  PARTE 2 — bloco estruturado linha a linha, vindo APENAS dos campos.
 * Nada de "Características adicionais" sem evidência estruturada.
 */
export function buildSeoBody(s: SeoSource, openingParagraph?: string | null): string {
  const type = typeLabel(s.property_type);
  const p = purposeLabel(s.purpose);
  const loc = locationPhrase(s);
  const condo = s.condominium_name ? cap(s.condominium_name) : null;

  // PARTE 1 — abertura
  let opening = openingParagraph?.trim() || "";
  if (!opening) {
    const bits: string[] = [];
    bits.push(`${type} ${p.action}${condo ? ` no condomínio ${condo}` : ""}, em ${loc}.`);
    const areaParts: string[] = [];
    if (s.area_built != null) areaParts.push(`área construída de ${fmtArea(s.area_built)}`);
    if (s.area_useful != null) areaParts.push(`área útil de ${fmtArea(s.area_useful)}`);
    if (s.area_total != null) areaParts.push(`terreno de ${fmtArea(s.area_total)}`);
    if (areaParts.length) {
      bits.push(`O imóvel possui ${areaParts.join(" e ")}.`);
    }
    opening = bits.join(" ");
  }

  // PARTE 2 — bloco estruturado (uma linha por dado)
  const lines: string[] = [];
  if (s.bedrooms != null) lines.push(`Dormitórios: ${s.bedrooms}`);
  if (s.suites != null) lines.push(`Suítes: ${s.suites}`);
  if (s.bathrooms != null) lines.push(`Banheiros: ${s.bathrooms}`);
  if (s.lavabos != null) lines.push(`Lavabos: ${s.lavabos}`);
  if (s.parking_covered != null || s.parking_uncovered != null) {
    const c = s.parking_covered ?? 0;
    const u = s.parking_uncovered ?? 0;
    const total = c + u;
    const detail: string[] = [];
    if (c) detail.push(`${c} ${c === 1 ? "coberta" : "cobertas"}`);
    if (u) detail.push(`${u} ${u === 1 ? "descoberta" : "descobertas"}`);
    lines.push(`Vagas: ${total}${detail.length ? ` (${detail.join(" + ")})` : ""}`);
  } else if (s.parking != null) {
    lines.push(`Vagas: ${s.parking}`);
  }
  if (s.area_useful != null) lines.push(`Área útil: ${fmtArea(s.area_useful)}`);
  if (s.area_built != null) lines.push(`Área construída: ${fmtArea(s.area_built)}`);
  if (s.area_total != null) lines.push(`Área total: ${fmtArea(s.area_total)}`);
  if (s.price_rent != null) lines.push(`Locação: ${fmtBRL(s.price_rent)}`);
  if (s.price_sale != null) lines.push(`Venda: ${fmtBRL(s.price_sale)}`);
  if (s.condo_fee != null) lines.push(`Condomínio: ${fmtBRL(s.condo_fee)}`);
  if (s.iptu != null) lines.push(`IPTU: ${fmtBRL(s.iptu)}`);
  if (s.furnished === true) lines.push("Mobiliado: sim");
  if (s.accepts_exchange === true) lines.push("Aceita permuta: sim");

  return [opening, lines.join("\n")].filter(Boolean).join("\n\n");
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
