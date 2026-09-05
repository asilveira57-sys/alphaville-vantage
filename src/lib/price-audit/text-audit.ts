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

const LABELS: { re: RegExp; field: PriceCol; label: string }[] = [
  { re: /valor\s+da\s+loca[çc][ãa]o/i, field: "price_rent", label: "Valor da locação" },
  { re: /valor\s+de\s+venda/i, field: "price_sale", label: "Valor de venda" },
  { re: /condom[íi]nio/i, field: "condo_fee", label: "Condomínio" },
  { re: /iptu/i, field: "iptu", label: "IPTU" },
  { re: /loca[çc][ãa]o/i, field: "price_rent", label: "Locação" },
  { re: /venda/i, field: "price_sale", label: "Venda" },
];

const MONEY_RE = /R\$\s?[\d][\d.,]*/g;

/** Extrai cada valor monetário do texto junto do rótulo que o precede. */
export function extractTextValues(text: string | null | undefined): TextHit[] {
  if (!text) return [];
  const hits: TextHit[] = [];
  for (const m of Array.from(text.matchAll(MONEY_RE))) {
    const idx = m.index ?? 0;
    const before = text.slice(Math.max(0, idx - 40), idx);
    const found = LABELS.find((l) => l.re.test(before));
    if (!found) continue;
    const parsed = parseValorBR(m[0]);
    hits.push({
      label: found.label,
      field: found.field,
      raw: m[0],
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
export function analyzeTexts(p: PropRow): { status: TextStatus; issues: TextIssue[] } {
  if (!p.descricao_seo && !p.seo_description) return { status: "sem_texto", issues: [] };
  const issues: TextIssue[] = [];
  const fields: TextField[] = ["descricao_seo", "seo_description"];
  for (const tf of fields) {
    for (const hit of extractTextValues(p[tf])) {
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
  return { status: issues.length ? "texto_desatualizado" : "texto_ok", issues };
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
