import { createFileRoute } from "@tanstack/react-router";
import { EditorialArticle } from "@/components/editorial-article";

export const Route = createFileRoute("/meio-ambiente/lazer")({
  head: () => ({
    meta: [
      { title: "Parques e trilhas — Meio ambiente em Alphaville" },
      { name: "description", content: "Onde se conectar com a natureza em Alphaville, Tamboré, Barueri e Santana de Parnaíba: parques, trilhas e bosques." },
      { property: "og:title", content: "Parques e trilhas da região de Alphaville" },
      { property: "og:description", content: "Áreas verdes públicas e de uso comunitário para lazer ao ar livre." },
    ],
    links: [{ rel: "canonical", href: "/meio-ambiente/lazer" }],
  }),
  component: () => (
    <EditorialArticle
      eyebrow="Lazer"
      title="Parques e trilhas"
      lead="Áreas verdes públicas, bosques de condomínio e trilhas leves para contato direto com a natureza, sem sair da região."
      parent={{ label: "Meio ambiente", to: "/meio-ambiente" }}
      html={`
        <h2 id="parques">Parques públicos</h2>
        <ul>
          <li><strong>Parque Municipal Dom José</strong> (Barueri) — lago, ciclovia e área de piquenique.</li>
          <li><strong>Parque dos Camargos</strong> (Barueri) — bosque urbano com trilhas curtas.</li>
          <li><strong>Parque Ecológico do Tietê</strong> — referência regional para caminhadas e ciclismo.</li>
        </ul>
        <h2 id="trilhas">Trilhas e bosques</h2>
        <p>Diversos condomínios mantêm trilhas internas em meio à mata preservada — uma forma de uso compatível com a conservação. Vale também conhecer trilhas leves no entorno de Santana de Parnaíba, com vista para o rio Tietê.</p>
        <h2 id="dicas">Dicas práticas</h2>
        <p>Use repelente, prefira o início da manhã, leve água e não saia das trilhas demarcadas. Respeite a fauna — observação à distância é a regra.</p>
        <p><em>Esta publicação é simbólica. A redação prepara um roteiro fotográfico completo com os melhores parques e trilhas da região.</em></p>
      `}
      related={[
        { label: "Fauna silvestre", to: "/meio-ambiente/fauna" },
        { label: "Áreas de preservação", to: "/meio-ambiente/areas" },
      ]}
    />
  ),
});
