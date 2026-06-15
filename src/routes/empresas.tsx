import { createFileRoute } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";

export const Route = createFileRoute("/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas e mercado corporativo de Barueri — S.A Imóveis Alphaville" },
      { name: "description", content: "Panorama das empresas instaladas em Barueri e Alphaville, benefícios fiscais e o mercado de trabalho regional." },
      { property: "og:title", content: "Empresas e mercado corporativo" },
      { property: "og:description", content: "Empresas, polos e mercado de trabalho da região." },
      { property: "og:url", content: "/empresas" },
    ],
    links: [{ rel: "canonical", href: "/empresas" }],
  }),
  component: () => (
    <SectionPage
      eyebrow="Negócios"
      title="Empresas e mercado corporativo"
      lead="Barueri é um dos maiores polos corporativos do Brasil. Conheça as empresas instaladas, os benefícios fiscais que atraem investimento e o mercado de trabalho regional."
      breadcrumbs={[{ label: "Empresas" }]}
    >
      <ComingSoonGrid
        items={[
          { eyebrow: "Polo", title: "Empresas instaladas em Barueri", lead: "As grandes corporações que escolheram a região." },
          { eyebrow: "Fiscal", title: "Benefícios fiscais", lead: "Por que Barueri atrai sedes nacionais e regionais." },
          { eyebrow: "Trabalho", title: "Mercado de trabalho local", lead: "Setores em alta e perfis mais demandados." },
        ]}
      />
    </SectionPage>
  ),
});
