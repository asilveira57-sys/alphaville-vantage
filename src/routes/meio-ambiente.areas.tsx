import { createFileRoute } from "@tanstack/react-router";
import { EditorialArticle } from "@/components/editorial-article";

export const Route = createFileRoute("/meio-ambiente/areas")({
  head: () => ({
    meta: [
      { title: "Áreas de preservação — Meio ambiente em Alphaville" },
      { name: "description", content: "Reservas, APPs e cinturões verdes em Alphaville, Tamboré, Barueri e Santana de Parnaíba." },
      { property: "og:title", content: "Áreas de preservação na região de Alphaville" },
      { property: "og:description", content: "Reservas legais, APPs e o papel dos cinturões verdes." },
    ],
    links: [{ rel: "canonical", href: "/meio-ambiente/areas" }],
  }),
  component: () => (
    <EditorialArticle
      eyebrow="Áreas"
      title="Áreas de preservação"
      lead="Reservas legais, APPs e o cinturão verde que define a paisagem de Alphaville, Tamboré e Santana de Parnaíba."
      parent={{ label: "Meio ambiente", to: "/meio-ambiente" }}
      html={`
        <h2 id="cinturao">O cinturão verde</h2>
        <p>O planejamento original de Alphaville e Tamboré previu amplas áreas verdes integradas aos condomínios. Essas reservas funcionam hoje como cinturão de proteção, regulando microclima, drenagem e biodiversidade.</p>
        <h2 id="app">APPs e reservas legais</h2>
        <p>Áreas de Preservação Permanente (APPs) ao redor de córregos, nascentes e topos de morro são protegidas por lei federal. Em condomínios, costumam coincidir com bosques internos e faixas marginais de lagos.</p>
        <h2 id="exemplos">Exemplos relevantes</h2>
        <ul>
          <li><strong>Reserva do Tamboré</strong> — uma das maiores áreas verdes contínuas da região.</li>
          <li><strong>Parque Ecológico do Tietê</strong> — referência regional de conservação.</li>
          <li><strong>APP do Rio Tietê e afluentes</strong> — define limites de ocupação em Barueri e Santana de Parnaíba.</li>
        </ul>
        <p><em>Publicação simbólica. A versão definitiva trará mapas e dados de áreas protegidas em parceria com a redação editorial.</em></p>
      `}
      related={[
        { label: "Fauna silvestre", to: "/meio-ambiente/fauna" },
        { label: "Parques e trilhas", to: "/meio-ambiente/lazer" },
      ]}
    />
  ),
});
