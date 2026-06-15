import { createFileRoute } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";

export const Route = createFileRoute("/escolas")({
  head: () => ({
    meta: [
      { title: "Escolas em Alphaville e região — S.A Imóveis Alphaville" },
      { name: "description", content: "Guia completo das melhores escolas particulares, bilíngues e faculdades de Alphaville, Tamboré e Barueri." },
      { property: "og:title", content: "Escolas em Alphaville e região" },
      { property: "og:description", content: "As principais escolas e faculdades da região." },
      { property: "og:url", content: "/escolas" },
    ],
    links: [{ rel: "canonical", href: "/escolas" }],
  }),
  component: () => (
    <SectionPage
      eyebrow="Educação"
      title="Escolas e faculdades da região"
      lead="Da educação infantil ao ensino superior: um guia editorial sobre as instituições que atendem famílias em Alphaville, Tamboré, Barueri e Santana de Parnaíba."
      breadcrumbs={[{ label: "Escolas" }]}
    >
      <ComingSoonGrid
        items={[
          { eyebrow: "Particulares", title: "Principais escolas particulares", lead: "Tradicionais, internacionais e construtivistas." },
          { eyebrow: "Bilíngues", title: "Escolas bilíngues e internacionais", lead: "Currículo bilíngue e IB na região." },
          { eyebrow: "Superior", title: "Faculdades e universidades", lead: "Opções de ensino superior próximas." },
        ]}
      />
    </SectionPage>
  ),
});
