// Normalização de cidade para o nome oficial (tabela public.cities).
// Usado pela normalização em massa, importador e verificação diária.
export type OfficialCity = { name: string; slug: string; uf: string; sort_priority?: number };

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Cidade oficial contida no texto; vazio → cidade do slug da URL de origem. null = revisão. */
export function resolveOfficialCity(raw: string | null | undefined, sourceUrl: string | null | undefined, cities: OfficialCity[]): string | null {
  const byLen = [...cities].sort((a, b) => b.name.length - a.name.length);
  const find = (t: string) => {
    const f = ` ${fold(t)} `;
    return byLen.find((c) => f.includes(` ${fold(c.name)} `))?.name ?? null;
  };
  if (raw && raw.trim()) return find(raw);
  if (sourceUrl) {
    const seg = new URL(sourceUrl).pathname.split("/").filter(Boolean)[2];
    if (seg) return find(seg.replace(/-/g, " "));
  }
  return null;
}

/** Ordem do filtro: Barueri e Santana de Parnaíba primeiro, depois alfabética. */
export function cityOrder(a: string, b: string): number {
  const p = (s: string) => (s === "Barueri" ? 0 : s === "Santana de Parnaíba" ? 1 : 2);
  return p(a) - p(b) || a.localeCompare(b, "pt-BR");
}
