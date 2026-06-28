import { createFileRoute } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";
import { GuiaCrossNav } from "@/components/guia-cross-nav";

export const Route = createFileRoute("/guia-alphaville")({
  head: () => ({
    meta: [
      { title: "Guia Alphaville — S.A Imóveis Alphaville" },
      { name: "description", content: "Guia completo de Alphaville: condomínios, escolas, gastronomia, lazer, mobilidade e qualidade de vida." },
      { property: "og:title", content: "Guia Alphaville — S.A Imóveis Alphaville" },
      { property: "og:description", content: "Tudo sobre Alphaville: condomínios, escolas, gastronomia e estilo de vida." },
      { property: "og:url", content: "/guia-alphaville" },
    ],
    links: [{ rel: "canonical", href: "/guia-alphaville" }],
  }),
  component: () => (
    <SectionPage
      eyebrow="Guia Regional"
      title="Alphaville em profundidade"
      lead="O dossiê completo sobre o primeiro grande complexo de condomínios fechados do Brasil: história, residenciais, escolas, gastronomia, lazer e mercado imobiliário."
      breadcrumbs={[{ label: "Guia Alphaville" }]}
    >
      <ComingSoonGrid
        items={[
          { eyebrow: "Residenciais", title: "Os primeiros condomínios", lead: "Como surgiram os Residenciais 1, 2 e 3 e por que continuam icônicos." },
          { eyebrow: "Educação", title: "Principais escolas particulares", lead: "Da educação infantil ao ensino médio bilíngue." },
          { eyebrow: "Gastronomia", title: "Restaurantes do Calçadão", lead: "Da culinária autoral às pizzarias clássicas." },
          { eyebrow: "Lazer", title: "Parques e clubes", lead: "Estrutura esportiva, áreas verdes e centros sociais." },
          { eyebrow: "Mobilidade", title: "Castelo Branco e Rodoanel", lead: "Acessos, fluxo e o futuro da mobilidade local." },
          { eyebrow: "Saúde", title: "Hospitais e clínicas de referência", lead: "Rede médica que atende a região." },
        ]}
      />
      <GuiaCrossNav currentTo="/guia-alphaville" />
    </SectionPage>
  ),
});
