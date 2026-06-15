import { createFileRoute } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";

export const Route = createFileRoute("/investimentos")({
  head: () => ({
    meta: [
      { title: "Investimentos imobiliários em Alphaville — S.A Imóveis Alphaville" },
      { name: "description", content: "Estratégias e análises sobre investimento imobiliário em Alphaville, Tamboré e Barueri: renda, valorização e diversificação." },
      { property: "og:title", content: "Investimentos imobiliários em Alphaville" },
      { property: "og:description", content: "Estratégias de investimento imobiliário na região." },
      { property: "og:url", content: "/investimentos" },
    ],
    links: [{ rel: "canonical", href: "/investimentos" }],
  }),
  component: () => (
    <SectionPage
      eyebrow="Investimentos"
      title="Investimento imobiliário na região"
      lead="Análises sobre liquidez, valorização e estratégias de investimento imobiliário em Alphaville, Tamboré e Barueri. Para quem busca renda, proteção patrimonial ou ganho de capital."
      breadcrumbs={[{ label: "Investimentos" }]}
    >
      <ComingSoonGrid
        items={[
          { eyebrow: "Renda", title: "Locação de alto padrão", lead: "Cenário, ticket médio e retorno por bairro." },
          { eyebrow: "Capital", title: "Estratégias de valorização", lead: "Quais regiões estão em ciclo de alta." },
          { eyebrow: "Corporativo", title: "Galpões e salas comerciais", lead: "Investimento no eixo Castelo Branco." },
        ]}
      />
    </SectionPage>
  ),
});
