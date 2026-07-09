import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { SectionPage } from "@/components/section-page";
import { PremiumCard } from "@/components/premium-card";
import { listPublishedByType } from "@/lib/editorial.functions";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const QO = queryOptions({
  queryKey: ["editorial", "guia"],
  queryFn: () => listPublishedByType({ data: { type: "guia" } }),
});

export const Route = createFileRoute("/guia/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(QO),
  head: () => ({
    meta: [
      { title: "Guias de bairros — Alphaville, Tamboré, Barueri e Santana de Parnaíba" },
      { name: "description", content: "Guias completos de cada bairro e sub-região do eixo Alphaville: história, mobilidade, serviços e qualidade de vida." },
      { property: "og:title", content: "Guias de bairros — eixo Alphaville" },
      { property: "og:description", content: "Conteúdo aprofundado sobre cada bairro e sub-região: história, mobilidade, serviços e qualidade de vida." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/guia` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/guia` }],
  }),
  component: GuiaIndex,
  errorComponent: ({ error }) => (
    <SiteLayout><section className="px-6 py-24 max-w-3xl mx-auto"><p className="text-sm">{error.message}</p></section></SiteLayout>
  ),
  notFoundComponent: () => null,
});

const STATIC_GUIDES = [
  { to: "/guia-alphaville", title: "Guia Alphaville", excerpt: "Dossiê completo sobre o primeiro grande complexo de condomínios fechados do Brasil." },
  { to: "/guia-tambore", title: "Guia Tamboré", excerpt: "Residenciais de luxo, clubes, escolas e mercado em valorização." },
  { to: "/guia-barueri", title: "Guia Barueri", excerpt: "Polo corporativo: história, benefícios fiscais, empresas e mobilidade." },
  { to: "/guia-santana-de-parnaiba", title: "Guia Santana de Parnaíba", excerpt: "Centro histórico tombado, gastronomia e novos condomínios." },
] as const;

function GuiaIndex() {
  const { data: items } = useSuspenseQuery(QO);
  return (
    <SectionPage
      eyebrow="Guias"
      title="Guias de bairros e sub-regiões"
      lead="Conteúdo aprofundado por bairro: história, mobilidade, serviços essenciais e qualidade de vida. Atualizado pela redação do portal."
      breadcrumbs={[{ label: "Guias" }]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
        {STATIC_GUIDES.map((g) => (
          <Link key={g.to} to={g.to} className="group block border-t border-ink/10 pt-6">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Guia Regional</p>
            <h3 className="font-serif text-2xl font-medium leading-snug mb-3 text-balance group-hover:underline">{g.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{g.excerpt}</p>
          </Link>
        ))}
        {items.map((g) => (
          <Link key={g.id} to="/guia/$slug" params={{ slug: g.slug }} className="group block border-t border-ink/10 pt-6">
            {g.featured_image && (
              <div className="aspect-[4/3] bg-ink/5 overflow-hidden mb-4">
                <img src={g.featured_image} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </div>
            )}
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Guia</p>
            <h3 className="font-serif text-2xl font-medium leading-snug mb-3 text-balance group-hover:underline">{g.title}</h3>
            {g.excerpt && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{g.excerpt}</p>}
          </Link>
        ))}
      </div>
    </SectionPage>
  );
}

