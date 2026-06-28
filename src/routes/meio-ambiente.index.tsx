import { createFileRoute } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";

export const Route = createFileRoute("/meio-ambiente")({
  head: () => ({
    meta: [
      { title: "Meio ambiente em Alphaville — S.A Imóveis Alphaville" },
      { name: "description", content: "Áreas de preservação, parques, fauna silvestre e sustentabilidade em Alphaville, Tamboré e arredores." },
      { property: "og:title", content: "Meio ambiente em Alphaville" },
      { property: "og:description", content: "Natureza, áreas de preservação e biodiversidade da região." },
      { property: "og:url", content: "/meio-ambiente" },
    ],
    links: [{ rel: "canonical", href: "/meio-ambiente" }],
  }),
  component: () => (
    <SectionPage
      eyebrow="Natureza"
      title="Meio ambiente e biodiversidade"
      lead="Alphaville e região concentram importantes áreas de preservação e uma biodiversidade rica para um perímetro tão próximo da capital. Um panorama editorial sobre natureza e sustentabilidade local."
      breadcrumbs={[{ label: "Meio ambiente" }]}
    >
      <ComingSoonGrid
        items={[
          { eyebrow: "Fauna", title: "Animais silvestres da região", lead: "Espécies que ainda habitam os fragmentos de Mata Atlântica." },
          { eyebrow: "Áreas", title: "Áreas de preservação", lead: "Reservas, APPs e a importância dos cinturões verdes." },
          { eyebrow: "Lazer", title: "Parques e trilhas", lead: "Onde se conectar com a natureza na região." },
        ]}
      />
    </SectionPage>
  ),
});
