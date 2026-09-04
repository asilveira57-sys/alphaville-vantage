// Camada de normalização independente do parser.
// Nunca inventa dados: só limpa, converte e compara.

export function norm(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const VIA_PREFIX: Array<[RegExp, string]> = [
  [/^(al|alameda)\b\.?/, "alameda"],
  [/^(av|avenida)\b\.?/, "avenida"],
  [/^(r|rua)\b\.?/, "rua"],
  [/^(rod|rodovia)\b\.?/, "rodovia"],
  [/^(estr|estrada)\b\.?/, "estrada"],
  [/^(pca|praca)\b\.?/, "praca"],
  [/^(trav|travessa)\b\.?/, "travessa"],
];

/** Normaliza nome de via, unificando abreviações (Al. → alameda). */
export function normStreet(s: string | null | undefined): string {
  let n = norm(s);
  for (const [re, full] of VIA_PREFIX) {
    if (re.test(n)) {
      n = n.replace(re, full);
      break;
    }
  }
  return n.replace(/\s+/g, " ").trim();
}

/** Separa "Alameda Rio Negro, 123" em nome da via e número. */
export function splitStreetNumber(raw: string | null | undefined): { street: string | null; number: string | null } {
  if (!raw) return { street: null, number: null };
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const m = cleaned.match(/^(.*?)[,\s]+n?[º°]?\s*(\d{1,6}[A-Za-z]?)\s*$/);
  if (m && m[1].trim().length > 2) return { street: m[1].trim(), number: m[2] };
  return { street: cleaned || null, number: null };
}

/** Similaridade 0..100 combinando igualdade normalizada, tokens e distância. */
export function similarity(a: string, b: string): number {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 100;

  const tx = new Set(x.split(" "));
  const ty = new Set(y.split(" "));
  // Números precisam bater exatamente (Tamboré 10 ≠ Tamboré 1)
  const nx = [...tx].filter((t) => /^\d+$/.test(t)).sort().join(",");
  const ny = [...ty].filter((t) => /^\d+$/.test(t)).sort().join(",");
  if (nx !== ny) return Math.min(60, jaccard(tx, ty) * 60);

  const j = jaccard(tx, ty);
  const lev = 1 - levenshtein(x, y) / Math.max(x.length, y.length);
  const contains = x.includes(y) || y.includes(x) ? 0.92 : 0;
  return Math.round(Math.max(j * 100, lev * 100, contains * 100));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const inter = [...a].filter((t) => b.has(t)).length;
  const uni = new Set([...a, ...b]).size;
  return uni ? inter / uni : 0;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** "R$ 3.500.000,00" → 3500000 */
export function parseMoney(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[^\d,.]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned.replace(/\.(?=\d{3}(?:[.,]|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** "560 m2" / "560,50m²" → 560 / 560.5 */
export function parseArea(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = String(raw).match(/([\d.,]+)/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/\.(?=\d{3}(?:[.,]|$))/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 110);
}

export function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b([a-zà-ÿ])/g, (c) => c.toUpperCase());
}

export type MatchState = "matched" | "review" | "missing";

export function stateForConfidence(confidence: number, hasCandidate: boolean): MatchState {
  if (!hasCandidate) return "missing";
  if (confidence >= 95) return "matched";
  if (confidence >= 80) return "review";
  return "missing";
}
