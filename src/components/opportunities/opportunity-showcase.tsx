import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { OpportunityCard } from "@/components/premium-cards/opportunity-card";
import type { OpportunityDTO } from "@/lib/opportunities.functions";

/**
 * Vitrine da home, logo abaixo do hero.
 *
 * Grid estático de três cards, não carrossel: em medições de tráfego real,
 * o primeiro slide de um carrossel concentra a maioria esmagadora dos
 * cliques, e um carrossel acima da dobra vira candidato instável a LCP.
 */
export function OpportunityShowcase({ items }: { items: OpportunityDTO[] }) {
  if (!items.length) return null;

  return (
    <section className="bg-[#F4F3EF] py-16 md:py-20" aria-labelledby="vitrine-title">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6 pb-10">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#1A1A1A]/45">
              Vitrine de Oportunidades
            </p>
            <h2
              id="vitrine-title"
              className="font-display mt-3 text-[32px] leading-[1.1] tracking-tight text-[#0D0D0D] md:text-[40px]"
            >
              Selecionados pela equipe S.A Imóveis
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#1A1A1A]/65">
              Imóveis que passaram pela nossa curadoria e entraram na vitrine por um motivo
              declarado. Cada sinalização é gerada pelos dados do anúncio, com data.
            </p>
          </div>

          <Link
            to={"/oportunidades" as never}
            className="inline-flex items-center gap-2 border-b-2 border-[#F2DA00] pb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0D0D0D] transition-colors hover:text-[#1A1A1A]/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F2DA00]"
          >
            Ver todas as oportunidades
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.2} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <OpportunityCard key={item.id} item={item} priority={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
