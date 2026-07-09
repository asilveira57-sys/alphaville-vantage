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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {STATIC_GUIDES.map((g) => (
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
        {items.map((g) => (
          <PremiumCard
            key={g.id}
            to={"/guia/$slug" as never}
            params={{ slug: g.slug } as never}
            image={g.featured_image ?? null}
            imageAlt={g.title}
            eyebrow="Guia"
            title={g.title}
            description={g.excerpt ?? undefined}
            cta="Ler guia"
            aspectRatio="tall"
            fallback={{ type: "post", seed: g.slug }}
          />
        ))}
      </div>
    </SectionPage>
  );
}

