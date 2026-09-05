// Auditoria dos valores congelados dentro dos TEXTOS (descricao_seo / seo_description).
// Puro, sem acesso a rede e sem IA. Reutiliza o interpretador monetário da Fase 1.
import { parseValorBR } from "./money";
import { buildValuesParagraph } from "@/lib/property-seo";

export type TextField = "descricao_seo" | "seo_description";
export type PriceCol = "price_sale" | "price_rent" | "condo_fee" | "iptu";

export type TextHit = {
  label: string;
  field: PriceCol;
  raw: string;
  value: number | null;
};

const LABEL_TO_FIELD: { test: RegExp; field: PriceCol; label: string }[] = [
  { test: /loca[çc][ãa]o/i, field: "price_rent", label: "Valor da locação" },
  { test: /venda/i, field: "price_sale", label: "Valor de venda" },
  { test: /condom[íi]nio/i, field: "condo_fee", label: "Condomínio" },
  { test: /iptu/i, field: "iptu", label: "IPTU" },
];

// Uma única varredura: rótulo e valor capturados no MESMO match.
const PAIR_RE =
  /(valor\s+da\s+loca[çc][ãa]o|valor\s+de\s+venda|loca[çc][ãa]o|venda|condom[íi]nio|iptu)\s*(?:aproximado|mensal|anual)?\s*:?\s*(?:de\s+)?(R\$\s?[\d][\d.,]*)/gi;

/** Extrai cada valor monetário do texto junto do rótulo do MESMO match. */
export function extractTextValues(text: string | null | undefined): TextHit[] {
  if (!text) return [];
  const hits: TextHit[] = [];
  for (const m of Array.from(text.matchAll(PAIR_RE))) {
    const rotulo = m[1];
    const found = LABEL_TO_FIELD.find((l) => l.test.test(rotulo));
    if (!found) continue;
    const parsed = parseValorBR(m[2]);
    hits.push({
      label: found.label,
      field: found.field,
      raw: m[2],
      value: parsed.ambiguo ? null : parsed.valor,
    });
  }
  return hits;
}


export type TextIssue = {
  text_field: TextField;
  label: string;
  price_field: PriceCol;
  found_raw: string;
  found_value: number | null;
  current_value: number | null;
  ratio: number | null;
};

export type PropRow = {
  id: string;
  slug: string;
  title: string;
  internal_code: string | null;
  price_sale: number | null;
  price_rent: number | null;
  condo_fee: number | null;
  iptu: number | null;
  descricao_seo: string | null;
  seo_description: string | null;
};

export type TextStatus = "texto_ok" | "texto_desatualizado" | "sem_texto";

/** Compara os valores citados nos textos com as colunas atuais. Tolerância R$ 1,00. */
export function analyzeTexts(p: PropRow): { status: TextStatus; issues: TextIssue[]; manualReview: boolean } {
  if (!p.descricao_seo && !p.seo_description) return { status: "sem_texto", issues: [], manualReview: false };
  const issues: TextIssue[] = [];
  const fields: TextField[] = ["descricao_seo", "seo_description"];
  let manualReview = false;
  for (const tf of fields) {
    const hits = extractTextValues(p[tf]);
    const seen = new Map<PriceCol, number>();
    for (const h of hits) seen.set(h.field, (seen.get(h.field) ?? 0) + 1);
    for (const hit of hits) {
      // Rótulo repetido no mesmo texto: não escolhemos por conta própria.
      if ((seen.get(hit.field) ?? 0) > 1) {
        manualReview = true;
        continue;
      }
      const cur = p[hit.field];
      if (hit.value == null) continue;
      if (cur != null && Math.abs(Number(cur) - hit.value) <= 1) continue;
      issues.push({
        text_field: tf,
        label: hit.label,
        price_field: hit.field,
        found_raw: hit.raw,
        found_value: hit.value,
        current_value: cur == null ? null : Number(cur),
        ratio: cur != null && hit.value > 0 ? Math.round((Number(cur) / hit.value) * 1000) / 1000 : null,
      });
    }
  }
  return { status: issues.length ? "texto_desatualizado" : "texto_ok", issues, manualReview };
}


const HAS_VALUE_LABEL = /(valor\s+de\s+venda|valor\s+da\s+loca[çc][ãa]o|condom[íi]nio\s*:|iptu\s*:)/i;

/**
 * Regenera SOMENTE o parágrafo de valores dentro de descricao_seo.
 * Os demais parágrafos permanecem byte a byte idênticos.
 */
export function fixValuesParagraph(
  descricaoSeo: string | null | undefined,
  cols: Pick<PropRow, "price_sale" | "price_rent" | "condo_fee" | "iptu">,
): { ok: boolean; before: string | null; after: string | null; text: string | null; reason?: string } {
  if (!descricaoSeo) return { ok: false, before: null, after: null, text: null, reason: "Sem descrição SEO" };
  const paras = descricaoSeo.split("\n\n");
  const idxs = paras.map((p, i) => (HAS_VALUE_LABEL.test(p) ? i : -1)).filter((i) => i >= 0);
  if (idxs.length === 0)
    return { ok: false, before: null, after: null, text: null, reason: "Nenhum parágrafo de valores encontrado — revisão manual" };
  if (idxs.length > 1)
    return { ok: false, before: null, after: null, text: null, reason: "Mais de um parágrafo com valores — revisão manual" };
  const i = idxs[0];
  const novo = buildValuesParagraph(cols);
  if (!novo) return { ok: false, before: paras[i], after: null, text: null, reason: "Imóvel sem valores cadastrados — revisão manual" };
  const before = paras[i];
  const next = [...paras];
  next[i] = novo;
  return { ok: before !== novo, before, after: novo, text: next.join("\n\n"), reason: before === novo ? "Já está correto" : undefined };
}
