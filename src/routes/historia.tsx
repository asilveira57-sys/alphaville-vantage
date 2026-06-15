import { createFileRoute } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";

export const Route = createFileRoute("/historia")({
  head: () => ({
    meta: [
      { title: "História de Alphaville e região — S.A Imóveis Alphaville" },
      { name: "description", content: "Da fundação de Alphaville aos primeiros condomínios, passando por Barueri e Santana de Parnaíba: a história editorial da região." },
      { property: "og:title", content: "História de Alphaville e região" },
      { property: "og:description", content: "A trajetória editorial de Alphaville, Barueri e Santana de Parnaíba." },
      { property: "og:url", content: "/historia" },
    ],
    links: [{ rel: "canonical", href: "/historia" }],
  }),
  component: () => (
    <SectionPage
      eyebrow="Memória"
      title="História da região"
      lead="A trajetória dos territórios que hoje formam Alphaville, Tamboré, Barueri e Santana de Parnaíba. Personagens, marcos urbanísticos e o nascimento do conceito de condomínio fechado planejado."
      breadcrumbs={[{ label: "História" }]}
    >
      <ComingSoonGrid
        items={[
          { eyebrow: "Fundador", title: "Quem foi Yojiro Takaoka", lead: "O empresário visionário por trás do projeto Alphaville." },
          { eyebrow: "Origem", title: "Como nasceu Alphaville", lead: "Da pastagem ao primeiro condomínio fechado do Brasil." },
          { eyebrow: "Cidade", title: "História de Barueri", lead: "Do povoado ribeirinho ao polo corporativo nacional." },
          { eyebrow: "Cidade", title: "História de Santana de Parnaíba", lead: "Centro bandeirante e patrimônio histórico tombado." },
          { eyebrow: "Marcos", title: "Primeiros condomínios", lead: "Como surgiram os Residenciais 1, 2 e 3." },
          { eyebrow: "Curiosidade", title: "O residencial mais antigo", lead: "História e estado atual do pioneiro de Alphaville." },
        ]}
      />
    </SectionPage>
  ),
});
