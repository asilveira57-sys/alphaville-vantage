import { createFileRoute } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";

export const Route = createFileRoute("/condominios")({
  head: () => ({
    meta: [
      { title: "Condomínios de Alphaville e Tamboré — S.A Imóveis Alphaville" },
      { name: "description", content: "Conheça todos os condomínios de Alphaville e Tamboré: residenciais, perfis, infraestrutura, valorização e curiosidades." },
      { property: "og:title", content: "Condomínios de Alphaville e Tamboré" },
      { property: "og:description", content: "Dossiê de todos os condomínios da região." },
      { property: "og:url", content: "/condominios" },
    ],
    links: [{ rel: "canonical", href: "/condominios" }],
  }),
  component: () => (
    <SectionPage
      eyebrow="Catálogo"
      title="Condomínios da região"
      lead="Um guia editorial dos residenciais de Alphaville, Tamboré e Santana de Parnaíba. Cada condomínio com sua história, perfil, infraestrutura e dinâmica de valorização."
      breadcrumbs={[{ label: "Condomínios" }]}
    >
      <ComingSoonGrid
        items={[
          { eyebrow: "Histórico", title: "Residencial 1", lead: "O primeiro condomínio de Alphaville." },
          { eyebrow: "Clássico", title: "Residencial 10", lead: "O maior em área verde por unidade." },
          { eyebrow: "Premium", title: "Tamboré 11", lead: "O mais novo e disputado da região." },
          { eyebrow: "Lazer", title: "Gênesis I e II", lead: "Estrutura completa para famílias." },
          { eyebrow: "Executivo", title: "Alphaville Zero", lead: "Localização nobre e perfil corporativo." },
          { eyebrow: "Investimento", title: "Edifícios verticais", lead: "Lançamentos e oportunidades de locação." },
        ]}
      />
    </SectionPage>
  ),
});
