/**
 * Interpretador monetário isolado da Auditoria de Valores.
 * Independente de qualquer parser existente do projeto.
 * Regra: ponto = milhar, vírgula = decimal. Nunca divide nem multiplica por 100.
 */

export type ValorBR = {
  valor: number | null;
  bruto: string;
  ambiguo: boolean;
  motivo: string | null;
};

const MONEY_RE = /\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?/g;

function toNumber(token: string): number | null {
  let t = token.trim();
  if (!t) return null;
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else {
    t = t.replace(/\./g, "");
  }
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

export function parseValorBR(texto: string | null | undefined): ValorBR {
  const bruto = (texto ?? "").toString();
  const base = { valor: null, bruto } as const;
  const t = bruto.trim();

  if (!t) return { ...base, ambiguo: true, motivo: "sem valor" };

  const low = t.toLowerCase();

  // sem valor declarado
  if (/sob\s+consulta|consulte|a\s+combinar|n[ãa]o\s+informado/.test(low)) {
    return { ...base, ambiguo: true, motivo: "sem valor" };
  }

  // parcelamento: "4 x R$ 781,00", "12x R$ 300,00"
  if (/\d+\s*x\s*(?:r\$)?\s*\d/.test(low)) {
    return { ...base, ambiguo: true, motivo: "parcelado" };
  }

  // valor por metro quadrado
  if (/\/\s*m\s*[²2]|por\s+m\s*[²2]|m\s*[²2]\s*\/|reais\s*\/\s*m/.test(low)) {
    return { ...base, ambiguo: true, motivo: "por m2" };
  }

  // faixas
  if (/a\s+partir\s+de|at[ée]\s+r\$|entre\s+r\$|de\s+r\$.*\ba\s+r\$/.test(low)) {
    return { ...base, ambiguo: true, motivo: "faixa" };
  }

  const tokens = t.match(MONEY_RE) ?? [];
  if (tokens.length === 0) return { ...base, ambiguo: true, motivo: "sem valor" };
  if (tokens.length > 1) return { ...base, ambiguo: true, motivo: "faixa" };

  const valor = toNumber(tokens[0]!);
  if (valor == null) return { ...base, ambiguo: true, motivo: "sem valor" };
  return { valor, bruto, ambiguo: false, motivo: null };
}

export function formatBRLValue(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
