import { createFileRoute } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";
import { GuiaCrossNav } from "@/components/guia-cross-nav";

export const Route = createFileRoute("/guia-barueri")({
  head: () => ({
    meta: [
      { title: "Guia Barueri — S.A Imóveis Alphaville" },
      { name: "description", content: "Guia completo de Barueri: história, mercado corporativo, benefícios fiscais, mobilidade e qualidade de vida." },
      { property: "og:title", content: "Guia Barueri — S.A Imóveis Alphaville" },
      { property: "og:description", content: "Tudo sobre Barueri: economia, empresas e estilo de vida." },
      { property: "og:url", content: "/guia-barueri" },
    ],
    links: [{ rel: "canonical", href: "/guia-barueri" }],
  }),
  component: () => (
    <SectionPage
      eyebrow="Guia Regional"
      title="Barueri em profundidade"
      lead="Mais que cidade-sede de Alphaville, Barueri é um dos maiores polos corporativos do país. Conheça sua história, benefícios fiscais, empresas instaladas e a infraestrutura que sustenta a região."
      breadcrumbs={[{ label: "Guia Barueri" }]}
    >
      <ComingSoonGrid
        items={[
          { eyebrow: "Economia", title: "Benefícios fiscais de Barueri", lead: "Por que empresas escolhem se instalar na cidade." },
          { eyebrow: "Empresas", title: "Grandes corporações instaladas", lead: "Panorama do mercado de trabalho local." },
          { eyebrow: "Mobilidade", title: "Castelo Branco e Rodoanel", lead: "Eixos de acesso e o futuro do transporte." },
        ]}
      />
    </SectionPage>
  ),
});
