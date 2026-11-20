/** Números ao vivo de uma rua (RPC public.street_overview). */
export type StreetTypeStat = {
  grupo: string; n: number;
  nv: number; min_venda: number | null; med_venda: number | null;
  na: number; min_aluguel: number | null; med_aluguel: number | null;
};
export type StreetOverview = {
  total: number; venda: number; aluguel: number;
  tipos: StreetTypeStat[];
  condominios: { nome: string; n: number; slug: string | null }[];
  atualizado: string;
};
export type NearbyItem = { cat: string; name: string; km: number; min?: number | null };

export const NEARBY_ORDER = ["Escolas", "Supermercado", "Farmácia", "Hospital", "Shopping", "Parque"];

export function groupNearby(items: unknown): { cat: string; items: NearbyItem[] }[] {
  const list = Array.isArray(items) ? (items as NearbyItem[]).filter((i) => i && i.cat && i.name) : [];
  return NEARBY_ORDER.map((cat) => ({ cat, items: list.filter((i) => i.cat === cat).sort((a, b) => a.km - b.km) }))
    .filter((g) => g.items.length > 0);
}

export const brl = (v: number | null | undefined) =>
  v ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v) : null;

export const kmLabel = (i: NearbyItem) =>
  `${String(i.km).replace(".", ",")} km${i.min ? ` · ${i.min} min de carro` : ""}`;

/** Perguntas calculadas na hora a partir dos números e do entorno. */
export function computedStreetFaq(name: string, o: StreetOverview | null, nearby: unknown): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  if (o && o.total > 0) {
    const partes = o.tipos.map((t) => `${t.n} ${t.grupo.toLowerCase()}`).join(", ");
    out.push({
      question: `Quantos imóveis a S.A Imóveis tem na ${name}?`,
      answer: `Hoje são ${o.total} imóveis na ${name} (${partes}): ${o.venda} à venda e ${o.aluguel} para alugar. O número muda conforme os imóveis entram e saem da nossa carteira.`,
    });
    const venda = o.tipos.filter((t) => t.min_venda).map((t) => `${t.grupo.toLowerCase()} a partir de ${brl(t.min_venda)}`);
    const aluguel = o.tipos.filter((t) => t.min_aluguel).map((t) => `${t.grupo.toLowerCase()} a partir de ${brl(t.min_aluguel)}/mês`);
    if (venda.length || aluguel.length) {
      out.push({
        question: `Quanto custa um imóvel na ${name}?`,
        answer: [venda.length ? `Para comprar: ${venda.join("; ")}.` : "", aluguel.length ? `Para alugar: ${aluguel.join("; ")}.` : ""].filter(Boolean).join(" "),
      });
    }
    if (o.condominios.length) {
      const top = o.condominios.slice(0, 6).map((c) => c.nome).join(", ");
      out.push({
        question: `Quais condomínios ficam na ${name}?`,
        answer: `Entre os condomínios e edifícios da ${name} com imóveis na nossa carteira estão ${top}${o.condominios.length > 6 ? `, entre outros (${o.condominios.length} no total)` : ""}.`,
      });
    }
  }
  const groups = groupNearby(nearby);
  if (groups.length) {
    const pick = groups.map((g) => `${g.cat.toLowerCase()}: ${g.items[0].name} (${String(g.items[0].km).replace(".", ",")} km)`).slice(0, 4);
    out.push({
      question: `O que tem perto da ${name}?`,
      answer: `Mais perto dos condomínios da rua: ${pick.join("; ")}. Distâncias de carro pelas ruas, sem trânsito.`,
    });
  }
  return out;
}
