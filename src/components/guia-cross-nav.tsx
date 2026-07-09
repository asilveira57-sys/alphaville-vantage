import { Link } from "@tanstack/react-router";
import { PremiumCard } from "@/components/premium-card";

const ALL = [
  { to: "/guia-alphaville", title: "Alphaville", excerpt: "Bairro planejado, condomínios icônicos e o coração do polo." },
  { to: "/guia-tambore", title: "Tamboré", excerpt: "Residenciais de luxo, clubes e mercado em valorização." },
  { to: "/guia-barueri", title: "Barueri", excerpt: "Polo corporativo, benefícios fiscais e mobilidade." },
  { to: "/guia-santana-de-parnaiba", title: "Santana de Parnaíba", excerpt: "Centro histórico tombado e novos condomínios." },
] as const;

export function GuiaCrossNav({ currentTo }: { currentTo: string }) {
  const others = ALL.filter((g) => g.to !== currentTo);
  return (
    <div className="mt-20 pt-12 border-t border-ink/10">
      <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <h2 className="font-serif text-2xl md:text-3xl">Explore outros guias</h2>
        <Link to="/guia" className="text-[11px] uppercase tracking-[0.2em] hover:underline">Ver todos os guias →</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {others.map((g) => (
          <PremiumCard
            key={g.to}
            to={g.to as never}
            image={null}
            imageAlt={g.title}
            eyebrow="Guia Regional"
            title={g.title}
            description={g.excerpt}
            cta="Abrir guia"
            aspectRatio="tall"
            fallback={{ type: "region", seed: g.to }}
          />
        ))}
      </div>
    </div>
  );
}
