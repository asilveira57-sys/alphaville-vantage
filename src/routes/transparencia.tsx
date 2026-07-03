import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";

const URL = "https://alphaville-vantage.lovable.app/transparencia";
const TITLE = "Transparência — S.A Imóveis Alphaville";
const DESC =
  "Compromissos éticos, proteção de dados, confiabilidade das informações e relacionamento aberto com clientes e comunidade.";

export const Route = createFileRoute("/transparencia")({
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
  component: Transparencia,
});

function Transparencia() {
  return (
    <SectionPage
      eyebrow="Compromisso"
      title="Transparência"
      lead="Transparência não é discurso: é método. Sistematizamos o que fazemos, como comunicamos e como protegemos os dados de quem confia em nós."
      breadcrumbs={[{ label: "Transparência" }]}
    >
      <div className="max-w-3xl space-y-10">
        <section>
          <h2 className="font-serif text-2xl mb-3">Compromisso ético</h2>
          <p className="text-ink/85 leading-relaxed">
            Atuamos com honestidade em cada negociação, com informação verificada, contratos claros
            e sem prometer o que não podemos entregar. Respeitamos concorrentes, colegas de mercado
            e clientes que optam por outros caminhos.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-3">Proteção de dados</h2>
          <p className="text-ink/85 leading-relaxed">
            Seguimos a LGPD e adotamos medidas técnicas e administrativas para proteger dados
            pessoais. Detalhes em <Link to="/politica-de-privacidade" className="underline underline-offset-4">Política de Privacidade</Link>
            {" "}e <Link to="/lgpd" className="underline underline-offset-4">LGPD</Link>.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-3">Confiabilidade das informações</h2>
          <p className="text-ink/85 leading-relaxed">
            Nosso conteúdo editorial é produzido por profissionais com vivência regional. Fontes,
            dados e atualizações são revisados periodicamente. Erros identificados são corrigidos
            com registro público de atualização.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-3">Relacionamento</h2>
          <p className="text-ink/85 leading-relaxed">
            Comunicação direta com o consultor responsável, respostas claras, registro documental
            das principais decisões e disponibilidade para dúvidas antes, durante e depois do
            fechamento. Veja nossa <Link to="/politica-de-atendimento" className="underline underline-offset-4">Política de Atendimento</Link>.
          </p>
        </section>
      </div>
    </SectionPage>
  );
}
