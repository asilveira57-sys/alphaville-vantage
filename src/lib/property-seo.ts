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
  description?: string | null; // descricao_original
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
 * Descrição SEO completa, em parágrafos legíveis.
 * Determinística: usa apenas dados estruturados + (opcionalmente) parágrafo de abertura gerado por IA.
 */
export function buildSeoBody(s: SeoSource, openingParagraph?: string | null): string {
  const type = typeLabel(s.property_type);
  const p = purposeLabel(s.purpose);
  const loc = locationPhrase(s);
  const condo = s.condominium_name ? cap(s.condominium_name) : null;

  // Abertura: usa IA se houver, senão template
  const opening = openingParagraph?.trim()
    ?? `${type} ${p.action}${condo ? ` no condomínio ${condo}` : ""}, localizado em ${loc}.`;

  // Bloco de características
  const lines: string[] = [];
  const area = fmtArea(s.area_useful ?? s.area_built ?? s.area_total);
  if (area) {
    const label = s.area_useful ? "área útil" : s.area_built ? "área construída" : "área total";
    lines.push(`O imóvel possui ${area} de ${label}.`);
  }
  const dormBits: string[] = [];
  if (s.bedrooms) dormBits.push(`${s.bedrooms} ${s.bedrooms === 1 ? "dormitório" : "dormitórios"}`);
  if (s.suites) dormBits.push(`sendo ${s.suites} ${s.suites === 1 ? "suíte" : "suítes"}`);
  if (s.bathrooms) dormBits.push(`${s.bathrooms} ${s.bathrooms === 1 ? "banheiro" : "banheiros"}`);
  if (s.parking) dormBits.push(`${s.parking} ${s.parking === 1 ? "vaga de garagem" : "vagas de garagem"}`);
  if (dormBits.length) lines.push(`Conta com ${dormBits.join(", ")}.`);

  const flags: string[] = [];
  if (s.furnished === true) flags.push("mobiliado");
  if (s.is_launch === true) flags.push("lançamento");
  if (s.accepts_exchange === true) flags.push("aceita permuta");
  if (flags.length) lines.push(`Características adicionais: ${flags.join(", ")}.`);

  // Valores
  const moneyLines: string[] = [];
  if (s.price_rent) moneyLines.push(`Valor da locação: ${fmtBRL(s.price_rent)}.`);
  if (s.price_sale) moneyLines.push(`Valor de venda: ${fmtBRL(s.price_sale)}.`);
  if (s.condo_fee) moneyLines.push(`Condomínio: ${fmtBRL(s.condo_fee)}.`);
  if (s.iptu) moneyLines.push(`IPTU: ${fmtBRL(s.iptu)}.`);

  return [opening, lines.join(" "), moneyLines.join(" ")].filter(Boolean).join("\n\n");
}

/**
 * JSON-LD Schema.org RealEstateListing.
 */
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
