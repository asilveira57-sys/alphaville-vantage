import { createFileRoute } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";

export const Route = createFileRoute("/guia-santana-de-parnaiba")({
  head: () => ({
    meta: [
      { title: "Guia Santana de Parnaíba — S.A Imóveis Alphaville" },
      { name: "description", content: "Guia completo de Santana de Parnaíba: centro histórico tombado, gastronomia, condomínios e mercado imobiliário." },
      { property: "og:title", content: "Guia Santana de Parnaíba — S.A Imóveis Alphaville" },
      { property: "og:description", content: "Tudo sobre Santana de Parnaíba: história, condomínios e cultura." },
      { property: "og:url", content: "/guia-santana-de-parnaiba" },
    ],
    links: [{ rel: "canonical", href: "/guia-santana-de-parnaiba" }],
  }),
  component: () => (
    <SectionPage
      eyebrow="Guia Regional"
      title="Santana de Parnaíba em profundidade"
      lead="Um dos centros históricos mais bem preservados do estado convive com condomínios de alto padrão e uma cena gastronômica em ascensão. Conheça a cidade que une tradição colonial e sofisticação contemporânea."
      breadcrumbs={[{ label: "Guia Santana de Parnaíba" }]}
    >
      <ComingSoonGrid
        items={[
          { eyebrow: "História", title: "Centro histórico tombado", lead: "Casarões coloniais, igrejas e o legado bandeirante." },
          { eyebrow: "Condomínios", title: "Novos residenciais", lead: "Onde Santana cresce e por que atrai novos moradores." },
          { eyebrow: "Gastronomia", title: "Restaurantes premiados", lead: "Da culinária tradicional aos novos endereços autorais." },
        ]}
      />
    </SectionPage>
  ),
});
