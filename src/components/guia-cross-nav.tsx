import { Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { PremiumCard } from "@/components/premium-card";
import { listPublishedByType } from "@/lib/editorial.functions";

const ALL = [
  { slug: "guia-alphaville", to: "/guia-alphaville", title: "Alphaville", excerpt: "Bairro planejado, condomínios icônicos e o coração do polo." },
  { slug: "guia-tambore", to: "/guia-tambore", title: "Tamboré", excerpt: "Residenciais de luxo, clubes e mercado em valorização." },
  { slug: "guia-barueri", to: "/guia-barueri", title: "Barueri", excerpt: "Polo corporativo, benefícios fiscais e mobilidade." },
  { slug: "guia-santana-de-parnaiba", to: "/guia-santana-de-parnaiba", title: "Santana de Parnaíba", excerpt: "Centro histórico tombado e novos condomínios." },
] as const;

const regionImagesQO = queryOptions({
  queryKey: ["editorial", "region-card-images"],
  queryFn: async () => {
    const rows = await listPublishedByType({ data: { type: "hub" } });
    return Object.fromEntries(
      rows
        .filter((row) => ALL.some((guide) => guide.slug === row.slug))
        .map((row) => [row.slug, row.featured_image]),
    ) as Record<string, string | null>;
  },
  staleTime: 0,
});

export function GuiaCrossNav({ currentTo }: { currentTo: string }) {
  const others = ALL.filter((g) => g.to !== currentTo);
  const { data: images = {} } = useQuery(regionImagesQO);
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
            image={images[g.slug] ?? null}
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
