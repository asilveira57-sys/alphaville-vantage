import { parseValorBR, type ValorBR } from "./money";

export type PriceField = "price_sale" | "price_rent" | "condo_fee" | "iptu";

export type FoundValue = { field: PriceField; raw: string | null; parsed: ValorBR | null };

function decode(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&aacute;/gi, "á").replace(/&eacute;/gi, "é").replace(/&iacute;/gi, "í")
    .replace(/&oacute;/gi, "ó").replace(/&uacute;/gi, "ú").replace(/&ccedil;/gi, "ç")
    .replace(/&atilde;/gi, "ã").replace(/&otilde;/gi, "õ").replace(/&ecirc;/gi, "ê");
}

/** Recorta apenas o bloco do imóvel principal, descartando "imóveis semelhantes". */
export function mainBlock(html: string): string {
  const start = html.search(/class="[^"]*infos_imovel/i);
  const from = start >= 0 ? start : 0;
  const rest = html.slice(from);
  const stopMarkers = [
    /<!--\s*flag_evolucao_valor/i,
    /im[oó]veis\s+semelhantes/i,
    /imoveis_semelhantes/i,
  ];
  let end = rest.length;
  for (const re of stopMarkers) {
    const m = rest.search(re);
    if (m > 0 && m < end) end = m;
  }
  return rest.slice(0, end);
}

/** Pares rótulo/valor da caixa estruturada de valores (div.valor). */
function structuredPairs(block: string): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  const re = /<div[^>]*class="[^"]*\bvalor\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    const inner = m[1] ?? "";
    const parts = inner
      .split(/<[^>]+>/)
      .map((s) => decode(s).replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (parts.length >= 2) out.push({ label: parts[0]!.toLowerCase(), value: parts.slice(1).join(" ") });
  }
  return out;
}

export function blockText(block: string): string {
  return decode(
    block
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h\d|li|span|small)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  ).replace(/[ \t]+/g, " ");
}

const LABELS: Record<PriceField, { structured: RegExp; text: RegExp }> = {
  price_sale: {
    structured: /^venda|valor\s+de\s+venda/,
    text: /(?:^|\n|\s)valor\s+(?:de\s+)?venda\s*:?\s*([^\n]{0,50})|(?:^|\n)\s*venda\s*:?\s*(r\$[^\n]{0,40})/i,
  },
  price_rent: {
    structured: /^aluguel|^loca[çc][ãa]o|valor\s+de\s+loca/,
    text: /(?:^|\n|\s)(?:aluguel|loca[çc][ãa]o)\s*:?\s*(r\$[^\n]{0,40})/i,
  },
  condo_fee: {
    structured: /condom[íi]nio/,
    text: /(?:^|\n|\s)cond(?:om[íi]nio|\.)\s*:?\s*(r\$[^\n]{0,40})/i,
  },
  iptu: {
    structured: /iptu/,
    text: /(?:^|\n|\s)iptu\s*:?\s*([^\n]{0,50})/i,
  },
};

function cutRaw(s: string): string {
  // corta em separadores comuns de comentário ("-", "(", "para")
  return s
    .replace(/\s{2,}[-–].*$/, "")
    .replace(/\s*\(.*$/, "")
    .trim();
}

/** Localiza os valores POR RÓTULO no HTML de um anúncio. */
export function extractValues(html: string): Record<PriceField, FoundValue> {
  const block = mainBlock(html);
  const pairs = structuredPairs(block);
  const text = blockText(block);

  const fields: PriceField[] = ["price_sale", "price_rent", "condo_fee", "iptu"];
  const result = {} as Record<PriceField, FoundValue>;

  for (const field of fields) {
    const cfg = LABELS[field];
    let raw: string | null = null;

    const hit = pairs.find((p) => cfg.structured.test(p.label));
    if (hit && /\d/.test(hit.value)) raw = cutRaw(hit.value);

    if (!raw) {
      const m = text.match(cfg.text);
      const captured = m ? (m[1] ?? m[2] ?? null) : null;
      if (captured && /\d/.test(captured)) raw = cutRaw(captured);
    }

    result[field] = raw ? { field, raw, parsed: parseValorBR(raw) } : { field, raw: null, parsed: null };
  }

  return result;
}
