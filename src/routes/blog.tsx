import { createFileRoute } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — S.A Imóveis Alphaville" },
      { name: "description", content: "Reportagens e análises sobre Alphaville, Tamboré, Barueri e Santana de Parnaíba: mercado imobiliário, arquitetura, história e estilo de vida." },
      { property: "og:title", content: "Blog — S.A Imóveis Alphaville" },
      { property: "og:description", content: "Reportagens editoriais sobre a região de Alphaville." },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: () => (
    <SectionPage
      eyebrow="Editorial"
      title="O blog da região de Alphaville"
      lead="Reportagens, análises e curadoria sobre mercado imobiliário, arquitetura, história e estilo de vida em Alphaville, Tamboré, Barueri e Santana de Parnaíba."
      breadcrumbs={[{ label: "Blog" }]}
    >
      <ComingSoonGrid
        items={[
          { eyebrow: "Em breve", title: "Quem foi Yojiro Takaoka", lead: "A história do visionário por trás do projeto Alphaville." },
          { eyebrow: "Em breve", title: "Como nasceu Alphaville", lead: "Da pastagem ao primeiro condomínio fechado planejado do Brasil." },
          { eyebrow: "Em breve", title: "Top 10 condomínios de Alphaville", lead: "Os endereços mais valorizados e por quê." },
          { eyebrow: "Em breve", title: "Condomínios para famílias", lead: "Lazer, segurança e escolas: o que considerar ao escolher." },
          { eyebrow: "Em breve", title: "Mercado corporativo de Barueri", lead: "Benefícios fiscais e empresas instaladas na região." },
          { eyebrow: "Em breve", title: "Investimentos imobiliários no Tamboré", lead: "Liquidez, valorização e perfis de comprador." },
        ]}
      />
    </SectionPage>
  ),
});
