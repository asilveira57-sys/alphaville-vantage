import { createFileRoute } from "@tanstack/react-router";
import { EditorialArticle } from "@/components/editorial-article";

export const Route = createFileRoute("/meio-ambiente/fauna")({
  head: () => ({
    meta: [
      { title: "Fauna silvestre — Meio ambiente em Alphaville" },
      { name: "description", content: "Espécies da Mata Atlântica que ainda habitam os fragmentos verdes de Alphaville, Tamboré e Santana de Parnaíba." },
      { property: "og:title", content: "Fauna silvestre da região de Alphaville" },
      { property: "og:description", content: "Animais silvestres, corredores ecológicos e biodiversidade local." },
    ],
    links: [{ rel: "canonical", href: "/meio-ambiente/fauna" }],
  }),
  component: () => (
    <EditorialArticle
      eyebrow="Fauna"
      title="Animais silvestres da região"
      lead="Mesmo em meio à urbanização intensa, fragmentos de Mata Atlântica em Alphaville e arredores ainda abrigam espécies que merecem atenção e proteção."
      parent={{ label: "Meio ambiente", to: "/meio-ambiente" }}
      html={`
        <h2 id="mata-atlantica">Resquícios da Mata Atlântica</h2>
        <p>A região metropolitana de Alphaville e Tamboré faz parte do bioma da Mata Atlântica, hoje reduzido a fragmentos. Esses remanescentes funcionam como ilhas de biodiversidade e corredores ecológicos fundamentais para a fauna local.</p>
        <h2 id="especies">Principais espécies observadas</h2>
        <ul>
          <li><strong>Sagui-de-tufo-preto</strong> — comum em condomínios com áreas verdes contínuas.</li>
          <li><strong>Quati</strong> — visto frequentemente em reservas próximas à Serra da Cantareira e ao Tamboré.</li>
          <li><strong>Tucano-toco</strong> e <strong>tucano-de-bico-preto</strong> — sinalizadores de matas conservadas.</li>
          <li><strong>Capivara</strong> — presente em lagos e áreas alagadas dos condomínios.</li>
          <li><strong>Bugio-ruivo</strong> — registrado em reservas particulares de Santana de Parnaíba.</li>
        </ul>
        <h2 id="convivencia">Convivência responsável</h2>
        <p>Não alimente animais silvestres, mantenha o lixo orgânico fechado e evite plantas tóxicas em áreas comuns. Cada condomínio pode contribuir para a manutenção desses corredores ecológicos.</p>
        <p><em>Esta é uma publicação simbólica. Em breve a redação publicará um dossiê fotográfico com biólogos parceiros.</em></p>
      `}
      related={[
        { label: "Áreas de preservação", to: "/meio-ambiente/areas" },
        { label: "Parques e trilhas", to: "/meio-ambiente/lazer" },
      ]}
    />
  ),
});
