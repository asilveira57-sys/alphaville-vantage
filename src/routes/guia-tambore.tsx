import { createFileRoute } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";
import { GuiaCrossNav } from "@/components/guia-cross-nav";

export const Route = createFileRoute("/guia-tambore")({
  head: () => ({
    meta: [
      { title: "Guia Tamboré — S.A Imóveis Alphaville" },
      { name: "description", content: "Guia completo do Tamboré: residenciais de luxo, clubes, escolas e mercado imobiliário em valorização." },
      { property: "og:title", content: "Guia Tamboré — S.A Imóveis Alphaville" },
      { property: "og:description", content: "Tudo sobre o Tamboré: residenciais, clubes e mercado." },
      { property: "og:url", content: "/guia-tambore" },
    ],
    links: [{ rel: "canonical", href: "/guia-tambore" }],
  }),
  component: () => (
    <SectionPage
      eyebrow="Guia Regional"
      title="Tamboré em profundidade"
      lead="Considerada uma das regiões de maior valorização do estado de São Paulo, o Tamboré reúne residenciais com arquitetura contemporânea, clubes privativos e infraestrutura de excelência."
      breadcrumbs={[{ label: "Guia Tamboré" }]}
    >
      <ComingSoonGrid
        items={[
          { eyebrow: "Residenciais", title: "Tamboré 1 ao 11", lead: "Diferenças, perfis e dinâmica de preços." },
          { eyebrow: "Clubes", title: "Estrutura esportiva e social", lead: "Golfe, equitação, tênis e clubes familiares." },
          { eyebrow: "Mercado", title: "Valorização e liquidez", lead: "Por que o Tamboré tem o m² mais disputado." },
        ]}
      />
    </SectionPage>
  ),
});
