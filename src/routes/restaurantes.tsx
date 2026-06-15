import { createFileRoute } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";

export const Route = createFileRoute("/restaurantes")({
  head: () => ({
    meta: [
      { title: "Restaurantes em Alphaville — S.A Imóveis Alphaville" },
      { name: "description", content: "Guia editorial dos melhores restaurantes, pizzarias e hamburguerias de Alphaville, Tamboré, Barueri e Santana de Parnaíba." },
      { property: "og:title", content: "Restaurantes em Alphaville e região" },
      { property: "og:description", content: "Curadoria gastronômica da região." },
      { property: "og:url", content: "/restaurantes" },
    ],
    links: [{ rel: "canonical", href: "/restaurantes" }],
  }),
  component: () => (
    <SectionPage
      eyebrow="Gastronomia"
      title="Restaurantes da região"
      lead="Uma curadoria editorial dos melhores endereços gastronômicos de Alphaville e arredores: da alta cozinha autoral aos clássicos de bairro."
      breadcrumbs={[{ label: "Restaurantes" }]}
    >
      <ComingSoonGrid
        items={[
          { eyebrow: "Alta cozinha", title: "Melhores restaurantes", lead: "Os endereços de referência para ocasiões especiais." },
          { eyebrow: "Italiano", title: "Melhores pizzarias", lead: "Da napolitana clássica à autoral." },
          { eyebrow: "Casual", title: "Melhores hamburguerias", lead: "Do smash burger à carta gourmet." },
          { eyebrow: "Mercado", title: "Supermercados e empórios", lead: "Onde fazer compras especiais." },
        ]}
      />
    </SectionPage>
  ),
});
