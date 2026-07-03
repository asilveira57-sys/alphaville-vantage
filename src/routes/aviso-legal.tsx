import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";

const URL = "https://alphaville-vantage.lovable.app/aviso-legal";
const TITLE = "Aviso Legal — S.A Imóveis Alphaville";
const DESC =
  "Aviso legal sobre a natureza das informações publicadas no portal da S.A Imóveis Alphaville, limitação de responsabilidade e atualização de conteúdos.";

export const Route = createFileRoute("/aviso-legal")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: Aviso,
});

function Aviso() {
  return (
    <SectionPage
      eyebrow="Legal"
      title="Aviso Legal"
      lead="As informações publicadas neste portal são de natureza informativa e editorial, sem constituir oferta vinculante nem aconselhamento jurídico, tributário ou financeiro."
      breadcrumbs={[{ label: "Aviso Legal" }]}
    >
      <div className="prose prose-neutral max-w-3xl prose-headings:font-serif prose-headings:text-ink prose-p:text-ink/85">
        <h2>Natureza das informações</h2>
        <p>Descrições de imóveis, condomínios, bairros e mercado são apresentadas de boa-fé, com base em dados públicos, informações de proprietários e experiência da equipe. Estão sujeitas a alterações e devem ser confirmadas em atendimento consultivo.</p>

        <h2>Limitação de responsabilidade</h2>
        <p>A S.A Imóveis Alphaville não se responsabiliza por decisões tomadas exclusivamente com base no conteúdo do portal, nem por eventuais divergências entre o conteúdo publicado e a realidade atual do imóvel.</p>

        <h2>Atualização das informações</h2>
        <p>Buscamos manter dados atualizados, mas oscilações de preço, disponibilidade e características podem ocorrer entre publicações. Confirme sempre com um consultor antes de qualquer decisão.</p>

        <h2>Documentos relacionados</h2>
        <p>Leia também <Link to="/termos-de-uso">Termos de Uso</Link>, <Link to="/politica-de-privacidade">Política de Privacidade</Link> e <Link to="/lgpd">LGPD</Link>.</p>
      </div>
    </SectionPage>
  );
}
