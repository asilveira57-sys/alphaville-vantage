// Parser específico da fonte "S.A. Imóveis — Site atual" (template Univen).
// Regras específicas desta fonte ficam SOMENTE aqui.

import { parsePropertyText } from "../property-parser";
import type { ParserResult, RawListing } from "./types";
import { parseArea, parseMoney, splitStreetNumber } from "./normalize";

export const SA_DOMAINS = ["saimoveisalphaville.com.br", "www.saimoveisalphaville.com.br"];

const FEATURES_VOCAB = [
  "Piscina", "Churrasqueira", "Área gourmet", "Ar-condicionado", "Aquecimento", "Lareira",
  "Hidromassagem", "Closet", "Armários", "Móveis planejados", "Varanda gourmet", "Varanda",
  "Jardim", "Sauna", "Academia", "Escritório", "Home theater", "Dependência de empregada",
  "Despensa", "Lavanderia", "Quintal", "Elevador", "Cozinha planejada", "Suíte máster",
];

const CONDO_FEATURES_VOCAB = [
  "Academia", "Piscina", "Segurança 24 horas", "Portaria", "Quadra", "Playground",
  "Salão de festas", "Área verde", "Clube", "Pista de caminhada", "Espaço gourmet",
  "Salão de jogos", "Brinquedoteca", "Lago", "Espaço pet", "Bicicletário",
];

function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function stripTags(input: string): string {
  return input.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function pickMeta(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i");
  return html.match(re)?.[1]?.trim() || null;
}

function jsonLd(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch { /* ignora JSON-LD inválido */ }
  }
  return out;
}

/** Recorta o HTML para a galeria do próprio imóvel (evita "imóveis semelhantes"). */
function galleryScope(html: string): string {
  const start = html.search(/id=["']fotos_imovel["']|class=["'][^"']*fotos_imovel/i);
  const rest = html.slice(start >= 0 ? start : 0);
  const cut = rest.search(/class=["'][^"']*(semelhantes|relacionados|similares|outros_imoveis)/i);
  return cut >= 0 ? rest.slice(0, cut) : rest;
}

const isChrome = (u: string) =>
  /(logo|logos|icone|icon|placeholder|whats|favicon|banner|avatar|social|mini_|topo_|supremo_|ficha|usuarios\/)/i.test(u);

/** Chave para deduplicar variações de resolução da MESMA foto. */
function photoKey(u: string): string {
  return u
    .replace(/^https?:\/\//, "")
    .replace(/\/(mini_|thumb_|small_|medium_|large_)/gi, "/")
    .replace(/[-_](\d{2,4})x(\d{2,4})(?=\.\w+$)/i, "")
    .replace(/\?.*$/, "")
    .toLowerCase();
}

function extractImages(html: string, base: string): string[] {
  const byKey = new Map<string, string>();
  const consider = (raw: string) => {
    let abs: string;
    try { abs = new URL(raw, base).toString(); } catch { return; }
    if (isChrome(abs)) return;
    const key = photoKey(abs);
    const prev = byKey.get(key);
    // prefere a maior resolução: sem prefixo de thumbnail
    if (!prev || (/\/(mini_|thumb_|small_)/i.test(prev) && !/\/(mini_|thumb_|small_)/i.test(abs))) {
      byKey.set(key, abs.replace(/\/(mini_|thumb_|small_)/i, "/"));
    }
  };

  const scope = galleryScope(html);
  const reCdn = /https?:\/\/cdn\d*\.uso\.com\.br\/\d+\/\d{4}\/\d{2}\/[^"'\s)]+\.(?:jpe?g|png|webp)/gi;
  let m: RegExpExecArray | null;
  while ((m = reCdn.exec(scope))) consider(m[0]);

  if (byKey.size === 0) {
    const reImg = /<img[^>]+(?:data-src|src)=["']([^"']+\.(?:jpe?g|png|webp))[^"']*["']/gi;
    while ((m = reImg.exec(scope))) consider(m[1]);
  }
  if (byKey.size === 0) {
    const og = pickMeta(html, "og:image");
    if (og) consider(og);
  }
  return [...byKey.values()].slice(0, 40);
}

function matchVocab(text: string, vocab: string[]): string[] {
  const n = norm(text);
  return vocab.filter((v) => n.includes(norm(v)));
}

function pickLabeled(text: string, label: RegExp): string | null {
  const m = text.match(label);
  return m ? m[1].trim() : null;
}

export function parseSaImoveis(html: string, url: string): ParserResult {
  const text = stripTags(html);
  const ld = jsonLd(html);
  const notFound: string[] = [];
  const path = new URL(url).pathname.replace(/\/+$/, "").split("/").filter(Boolean);

  const ogTitle = pickMeta(html, "og:title");
  const ogDescription = pickMeta(html, "og:description");
  const metaDescription = pickMeta(html, "description");
  const docTitle = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || null;
  const h1 = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "") || null;

  const purpose: RawListing["purpose"] =
    /^alugar$/i.test(path[0] ?? "") ? "rent"
      : /^comprar-ou-alugar$/i.test(path[0] ?? "") ? "both"
        : /^(comprar|venda)$/i.test(path[0] ?? "") ? "sale"
          : null;

  const descriptionBlock =
    html.match(/<div[^>]*(?:id|class)=["'][^"']*(descricao|descrição|texto_imovel)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[2] ?? null;
  const descriptionHtml = descriptionBlock
    ? descriptionBlock.replace(/<(script|style|button|nav|form)[\s\S]*?<\/\1>/gi, "").trim()
    : null;
  const descriptionText = descriptionHtml ? stripTags(descriptionHtml) : (ogDescription ?? null);

  // Parser determinístico já existente (números, preços, áreas, tipo).
  const parsed = parsePropertyText({
    title: h1 ?? ogTitle ?? "",
    description: `${descriptionText ?? ""}\n${text.slice(0, 9000)}`,
    url,
  });

  const externalCode = /^\d+$/.test(path.at(-1) ?? "") ? path.at(-1)! : null;
  const cityFromPath = path[2] ? path[2].replace(/-/g, " ") : null;
  const neighborhoodFromPath = path[3] ? path[3].replace(/-/g, " ") : null;
  const stateFromPath = path[1] && /^[a-z]{2}$/i.test(path[1]) ? path[1].toUpperCase() : null;

  const postalCode = text.match(/\b(\d{5}-?\d{3})\b/)?.[1] ?? null;
  const streetRaw =
    pickLabeled(text, /\b(?:Endere[çc]o|Logradouro)\s*:?\s*([^|•\n]{5,90})/i) ??
    text.match(/\b((?:Alameda|Al\.|Avenida|Av\.|Rua|R\.|Estrada|Rodovia|Travessa|Pra[çc]a)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^,|•\n]{2,60}(?:,\s*\d{1,6})?)/)?.[1] ??
    null;
  const { street, number } = splitStreetNumber(streetRaw);

  const condominiumText =
    parsed.condominium_name ??
    pickLabeled(text, /\b(?:Condom[íi]nio|Residencial|Empreendimento)\s*:?\s*([A-Za-zÀ-ÿ0-9'´`\s\-]{3,50})/i);

  const areaLand = parseArea(pickLabeled(text, /\b[ÁA]rea\s+(?:do\s+)?terreno\s*:?\s*([\d.,]+\s*m)/i));
  const prices = {
    sale: parsed.price_sale,
    rent: parsed.price_rent,
    condoFee: parsed.condo_fee ?? parseMoney(pickLabeled(text, /\bCondom[íi]nio\s*:?\s*(R\$\s*[\d.,]+)/i)),
    iptu: parsed.iptu ?? parseMoney(pickLabeled(text, /\bIPTU\s*:?\s*(R\$\s*[\d.,]+)/i)),
  };

  const featureSource = `${descriptionText ?? ""} ${text.slice(0, 12000)}`;
  const features = matchVocab(featureSource, FEATURES_VOCAB);
  const condoFeatures = matchVocab(featureSource, CONDO_FEATURES_VOCAB);

  const images = extractImages(html, url);

  const listing: RawListing = {
    parser: "sa-imoveis",
    sourceLabel: "S.A. Imóveis — Site atual",
    url,
    externalCode,
    // Só aceita código interno plausível (contém dígito); evita ruído do texto.
    internalCode: parsed.internal_code && /\d/.test(parsed.internal_code) ? parsed.internal_code : null,
    // Título: h1 descritivo; senão compõe com tipo + condomínio/bairro + cidade.
    title: (h1 && h1.length > 12 ? h1 : null) ?? composeTitle(
      parsed.property_type ?? (path[4] ? path[4].replace(/-/g, " ") : null),
      condominiumText,
      parsed.neighborhood ?? (path[3] ? path[3].replace(/-/g, " ") : null),
      parsed.city ?? (path[2] ? path[2].replace(/-/g, " ") : null),
    ) ?? h1 ?? ogTitle,
    descriptionHtml,
    descriptionText,
    purpose:
      purpose ??
      (prices.sale && prices.rent ? "both" : prices.rent ? "rent" : prices.sale ? "sale" : null),
    propertyTypeText: parsed.property_type ?? (path[4] ? path[4].replace(/-/g, " ") : null),
    address: {
      postalCode,
      state: parsed.state ?? stateFromPath,
      city: parsed.city ?? cityFromPath,
      neighborhood: parsed.neighborhood ?? neighborhoodFromPath,
      street,
      number,
      complement: null,
      condominiumText,
    },
    areas: {
      total: parsed.area_total,
      built: parsed.area_built,
      useful: parsed.area_useful,
      land: areaLand,
    },
    rooms: {
      bedrooms: parsed.bedrooms,
      suites: parsed.suites,
      bathrooms: parsed.bathrooms,
      lavabos: parsed.lavabos,
      parking: parsed.parking,
      parkingCovered: parsed.parking_covered,
      parkingUncovered: parsed.parking_uncovered,
    },
    prices,
    features,
    condoFeatures,
    unknownFeatures: [],
    images,
    seo: { title: docTitle, description: metaDescription, ogTitle, ogDescription },
    notFound,
  };

  for (const [field, value] of Object.entries({
    cep: postalCode, rua: street, numero: number, condominio: condominiumText,
    preco: prices.sale ?? prices.rent, dormitorios: listing.rooms.bedrooms,
    area: listing.areas.useful ?? listing.areas.built ?? listing.areas.total,
    descricao: descriptionText,
  })) {
    if (value == null || value === "") notFound.push(field);
  }

  return {
    listing,
    log: {
      parser: "sa-imoveis",
      jsonLdBlocks: ld.length,
      htmlLength: html.length,
      imagesFound: images.length,
      fieldsNotFound: notFound,
    },
  };
}

/** Compõe um título legível quando o anúncio não traz um h1 descritivo. */
function composeTitle(
  type: string | null, condo: string | null, neighborhood: string | null, city: string | null,
): string | null {
  const t = type ? type.charAt(0).toUpperCase() + type.slice(1) : null;
  const parts = [t, condo ? `no ${condo}` : neighborhood ? `no ${neighborhood}` : null, city].filter(Boolean);
  return parts.length >= 2 ? parts.join(" — ") : null;
}
