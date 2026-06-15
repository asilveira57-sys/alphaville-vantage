import { createFileRoute } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";

export const Route = createFileRoute("/imoveis")({
  head: () => ({
    meta: [
      { title: "Imóveis em Alphaville — S.A Imóveis Alphaville" },
      { name: "description", content: "Catálogo de imóveis para venda e locação em Alphaville, Tamboré, Barueri e Santana de Parnaíba." },
      { property: "og:title", content: "Imóveis em Alphaville" },
      { property: "og:description", content: "Portfólio S.A: casas, apartamentos e lançamentos." },
      { property: "og:url", content: "/imoveis" },
    ],
    links: [{ rel: "canonical", href: "/imoveis" }],
  }),
  component: () => (
    <SectionPage
      eyebrow="Portfólio"
      title="Imóveis selecionados"
      lead="Em breve: catálogo completo de casas, apartamentos, terrenos e lançamentos em Alphaville, Tamboré, Barueri e Santana de Parnaíba — importado diretamente do nosso acervo."
      breadcrumbs={[{ label: "Imóveis" }]}
    >
      <ComingSoonGrid
        items={[
          { eyebrow: "Em breve", title: "Casas em Alphaville", lead: "Catálogo importado automaticamente do acervo S.A." },
          { eyebrow: "Em breve", title: "Apartamentos em Alphaville", lead: "Verticais clássicos e lançamentos recentes." },
          { eyebrow: "Em breve", title: "Locação de alto padrão", lead: "Casas e apartamentos para locação." },
          { eyebrow: "Em breve", title: "Terrenos em Alphaville", lead: "Lotes em residenciais selecionados." },
          { eyebrow: "Em breve", title: "Galpões em Barueri", lead: "Oportunidades no eixo logístico Castelo Branco." },
          { eyebrow: "Em breve", title: "Salas comerciais", lead: "Mercado corporativo em Alphaville e Tamboré." },
        ]}
      />
    </SectionPage>
  ),
});
