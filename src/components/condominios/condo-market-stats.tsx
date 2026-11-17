import { Link } from "@tanstack/react-router";
import type { CondoPropertyDTO } from "@/lib/condo-properties.functions";

/**
 * "O condomínio em números hoje": contagem, faixa e mediana de preço e m², por finalidade e tipo,
 * calculados dos imóveis ativos que a página já carrega. Frase-resposta citável por buscadores e IAs.
 */

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const short = (n: number) => {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${v < 2 ? "milhão" : "milhões"}`;
  }
  if (n >= 10_000) return `R$ ${Math.round(n / 1000).toLocaleString("pt-BR")} mil`;
  return brl(n);
};
const TYPE_PLURAL: Record<string, string> = { casa: "casas", apartamento: "apartamentos", terreno: "terrenos", sala: "salas", loja: "lojas", "galpão": "galpões" };

type Group = { key: string; label: string; count: number; min: number; max: number; med: number; m2: number | null };

function groups(items: CondoPropertyDTO[], purpose: "sale" | "rent"): Group[] {
  const col = purpose === "sale" ? "price_sale" : "price_rent";
  const rows = items.filter((p) => (p.purpose === purpose || p.purpose === "both") && (p[col] ?? 0) > 0);
  const byType = new Map<string, CondoPropertyDTO[]>();
  for (const p of rows) {
    const t = p.property_type ?? "imóvel";
    byType.set(t, [...(byType.get(t) ?? []), p]);
  }
  return [...byType.entries()]
    .map(([t, ps]) => {
      const prices = ps.map((p) => p[col] as number);
      const m2s = purpose === "sale"
        ? ps.filter((p) => p.area && p.area >= 25 && p.area <= 5000).map((p) => (p.price_sale as number) / (p.area as number)).filter((v) => v >= 2000 && v <= 80000)
        : [];
      return {
        key: t, label: TYPE_PLURAL[t] ?? `${t}s`, count: ps.length,
        min: Math.min(...prices), max: Math.max(...prices), med: median(prices) as number,
        m2: m2s.length >= 3 ? median(m2s) : null,
      };
    })
    .sort((a, b) => b.count - a.count);
}

function sentence(g: Group, purpose: "sale" | "rent") {
  const verb = purpose === "sale" ? "à venda" : "para alugar";
  const suffix = purpose === "rent" ? " por mês" : "";
  if (g.count === 1) return `1 ${g.label.replace(/s$/, "")} ${verb}, por ${short(g.min)}${suffix}.`;
  const med = g.count > 2 ? `; mediana de ${short(g.med)}${suffix}` : "";
  const m2 = g.m2 ? ` e m² mediano de ${brl(Math.round(g.m2))}` : "";
  return `${g.count} ${g.label} ${verb}, de ${short(g.min)} a ${short(g.max)}${suffix}${med}${m2}.`;
}

export function CondoMarketStats({ name, items, links }: { name: string; items: CondoPropertyDTO[]; links: { slug: string; title: string; purpose: string }[] }) {
  const sale = groups(items, "sale");
  const rent = groups(items, "rent");
  if (!sale.length && !rent.length) return null;
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
  return (
    <section className="px-6 py-14 border-t border-ink/8 bg-ink/[0.02]">
      <div className="max-w-5xl mx-auto">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Atualizado todos os dias</p>
        <h2 className="font-serif text-2xl md:text-3xl mb-6">{name} em números hoje</h2>
        <p className="text-sm text-muted-foreground mb-8">Imóveis ativos na carteira da S.A Imóveis em {today}.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sale.length > 0 && (
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-ink/60 mb-3">À venda</h3>
              <ul className="space-y-2 text-base leading-relaxed">{sale.map((g) => <li key={g.key}>{sentence(g, "sale")}</li>)}</ul>
            </div>
          )}
          {rent.length > 0 && (
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.2em] font-semibold text-ink/60 mb-3">Para alugar</h3>
              <ul className="space-y-2 text-base leading-relaxed">{rent.map((g) => <li key={g.key}>{sentence(g, "rent")}</li>)}</ul>
            </div>
          )}
        </div>
        {links.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3">
            {links.map((l) => (
              <Link key={l.slug} to="/imoveis-alphaville/$slug" params={{ slug: l.slug }} className="inline-flex items-center px-4 py-2 text-[11px] uppercase tracking-[0.18em] border border-ink/20 hover:border-ink">
                {l.title} →
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
