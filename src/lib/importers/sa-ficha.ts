// Leitura da ficha do imóvel no site principal (template Univen/uso.com.br).
// Lê SOMENTE o bloco `.dados_imovel` (título, referência, localização, valores,
// detalhes), a `.descricao_imovel` e os itens de `.mais_detalhes`.
// Nunca lê menu, filtros de busca ("Condomínio", "Lançamento", "Metragem")
// nem os cards de imóveis semelhantes.

export type SaFicha = {
  found: boolean;
  sourceId: string | null;
  code: string | null;
  propertyType: string | null;
  /** Texto do tipo fora da lista fixa (precisa de revisão). */
  propertyTypeRaw: string | null;
  street: string | null;
  empreendimento: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  lavabos: number | null;
  parking: number | null;
  areaUseful: number | null;
  areaBuilt: number | null;
  areaTotal: number | null;
  areaLand: number | null;
  priceSale: number | null;
  priceRent: number | null;
  condoFee: number | null;
  iptu: number | null;
  iptuPeriod: "anual" | "mensal" | null;
  descriptionText: string | null;
  descriptionHtml: string | null;
  features: string[];
};

const LOWER = new Set(["de", "da", "do", "dos", "das", "e", "di", "du"]);

export function capName(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => {
      if (i > 0 && LOWER.has(w)) return w;
      if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(w)) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function decode(s: string): string {
  return s
    .replace(/&nbsp;?/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function text(html: string): string {
  return decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function money(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/R\$\s*([\d.]+(?:,\d{1,2})?)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function num(raw: string): number | null {
  const n = parseFloat(raw.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Recorta um elemento pela classe, balanceando <div>. */
function block(html: string, cls: string, from = 0): string | null {
  const re = new RegExp(`<(div|section)[^>]*class=["'](?:[^"']*\\s)?${cls}(?:\\s[^"']*)?["'][^>]*>`, "i");
  const sub = html.slice(from);
  const m = re.exec(sub);
  if (!m) return null;
  const start = from + m.index;
  const tag = /<\/?div\b[^>]*>/gi;
  tag.lastIndex = start;
  let depth = 0;
  let t: RegExpExecArray | null;
  while ((t = tag.exec(html))) {
    depth += t[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, t.index + t[0].length);
  }
  return html.slice(start);
}

const EMPTY: Omit<SaFicha, "sourceId"> = {
  found: false, code: null, propertyType: null, propertyTypeRaw: null, street: null, empreendimento: null,
  neighborhood: null, city: null, state: null, bedrooms: null, suites: null,
  bathrooms: null, lavabos: null, parking: null, areaUseful: null, areaBuilt: null,
  areaTotal: null, areaLand: null, priceSale: null, priceRent: null, condoFee: null,
  iptu: null, iptuPeriod: null, descriptionText: null, descriptionHtml: null, features: [],
};

const TYPE_LIST: Record<string, string> = {
  casa: "casa", apartamento: "apartamento", terreno: "terreno", galpao: "galpão", area: "área",
  chacara: "chácara", sala: "sala", loja: "loja", predio: "prédio", cobertura: "cobertura",
  sobrado: "sobrado", studio: "studio",
};
export const PROPERTY_TYPES = Object.values(TYPE_LIST);

/** Tipo da lista fixa (com acento) ou null quando o texto não está na lista. */
export function normalizePropertyType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const k = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return TYPE_LIST[k] ?? null;
}

export function sourceIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.replace(/[?#].*$/, "").replace(/\/+$/, "").match(/(\d{5,})$/);
  return m ? m[1] : null;
}

export function extractSaFicha(html: string, url: string): SaFicha {
  const sourceId = sourceIdFromUrl(url);
  const dados = block(html, "dados_imovel");
  if (!dados) return { ...EMPTY, sourceId };

  const out: SaFicha = { ...EMPTY, features: [], sourceId, found: true };

  const h1 = dados.match(/<h1[^>]*class=["'][^"']*titulo[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) {
    const raw = text(h1);
    out.propertyType = normalizePropertyType(raw);
    if (!out.propertyType && raw) out.propertyTypeRaw = raw;
  }

  const ref = dados.match(/class=["']referencia["'][\s\S]*?<span>([^<]+)<\/span>/i)?.[1];
  if (ref && /\d/.test(ref)) out.code = text(ref).toUpperCase();

  // Localização: <span>RUA</span><span> - empreendimento</span>…<span>BAIRRO - CIDADE/UF</span>
  const loc = dados.match(/<h2[^>]*class=["'][^"']*localizacao[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i)?.[1];
  if (loc) {
    const spans = [...loc.matchAll(/<span>([\s\S]*?)<\/span>/gi)].map((m) => text(m[1]).replace(/^-\s*/, "").trim());
    const last = spans.at(-1) ?? "";
    const lm = last.match(/^(.*?)\s+-\s+(.+?)\/([A-Z]{2})$/i);
    if (lm) {
      out.neighborhood = lm[1] ? capName(lm[1]) : null;
      out.city = capName(lm[2]);
      out.state = lm[3].toUpperCase();
    }
    const middle = spans.slice(0, -1);
    if (middle[0]) out.street = capName(middle[0]);
    const condo = middle.slice(1).find((s) => s.length > 1);
    if (condo) out.empreendimento = capName(condo);
  }

  // Valores
  for (const v of dados.matchAll(/<div class=["']valor\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)) {
    const inner = v[1];
    const head = text(inner.match(/<(?:h3|small)[^>]*>([\s\S]*?)<\/(?:h3|small)>/i)?.[1] ?? "").toLowerCase();
    const value = money(text(inner));
    if (/pacote/.test(head)) continue; // pacote (aluguel+condomínio+IPTU) nunca é o aluguel
    if (/^venda/.test(head)) out.priceSale = value;
    else if (/^(loca|alug)/.test(head)) out.priceRent = value;
    else if (/^condom/.test(head)) out.condoFee = value;
    else if (/^iptu/.test(head)) {
      out.iptu = value;
      const t = text(inner).toLowerCase();
      out.iptuPeriod = /anual/.test(t) ? "anual" : /mensal/.test(t) ? "mensal" : null;
    }
  }

  // Detalhes (contagens e áreas). Ausência do item na ficha = null (desconhecido), nunca 0.
  const det = block(dados, "detalhes");
  if (det) {
    for (const d of det.matchAll(/<div class=["']detalhe["']>([\s\S]*?)<\/div>/gi)) {
      const t = text(d[1]).toLowerCase();
      let m: RegExpMatchArray | null;
      if ((m = t.match(/([\d.,]+)\s*m²?\s*(útil|util|privativa|construída|construida|total|terreno)/))) {
        const n = num(m[1]);
        const k = m[2];
        if (/til|privativa/.test(k)) out.areaUseful = n;
        else if (/constru/.test(k)) out.areaBuilt = n;
        else if (k === "total") out.areaTotal = n;
        else out.areaLand = n;
      } else if ((m = t.match(/(\d+)\s*su[ií]tes?/))) out.suites = +m[1];
      else if ((m = t.match(/(\d+)\s*dormit/))) out.bedrooms = +m[1];
      else if ((m = t.match(/(\d+)\s*lavabos?/))) out.lavabos = +m[1];
      else if ((m = t.match(/(\d+)\s*banheiros?/))) out.bathrooms = +m[1];
      else if ((m = t.match(/(\d+)\s*vagas?/))) out.parking = +m[1];
    }
  }

  const desc = block(html, "descricao_imovel");
  const texto = desc ? block(desc, "texto") : null;
  if (texto) {
    out.descriptionHtml = texto.replace(/^<div[^>]*>|<\/div>$/g, "").trim();
    out.descriptionText = text(texto) || null;
  }

  const mais = block(html, "mais_detalhes");
  if (mais) {
    out.features = [...mais.matchAll(/class=["']item_unico["'][\s\S]*?<span>([^<]+)<\/span>/gi)].map((m) => text(m[1]));
  }

  return out;
}
