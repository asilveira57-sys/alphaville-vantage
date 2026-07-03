import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";

const URL = "https://alphaville-vantage.lovable.app/politica-de-atendimento";
const TITLE = "Política de Atendimento — S.A Imóveis Alphaville";
const DESC =
  "Prazos de resposta, canais oficiais, horários e compromissos de qualidade do atendimento da S.A Imóveis Alphaville.";

export const Route = createFileRoute("/politica-de-atendimento")({
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
  component: Atendimento,
});

function Atendimento() {
  return (
    <SectionPage
      eyebrow="Compromissos"
      title="Política de Atendimento"
      lead="Nosso atendimento é consultivo, direto e regional. Este documento reúne prazos, canais e compromissos que orientam a relação com cada cliente."
      breadcrumbs={[{ label: "Política de Atendimento" }]}
    >
      <div className="max-w-3xl space-y-10">
        <section>
          <h2 className="font-serif text-2xl mb-3">Canais oficiais</h2>
          <ul className="list-disc list-inside space-y-1 text-ink/85">
            <li>Telefone (11) 94788-8299</li>
            <li>WhatsApp (11) 99551-5053</li>
            <li>E-mail contato@saimoveisalphaville.com.br</li>
            <li>Formulário na página de <Link to="/contato" className="underline underline-offset-4">contato</Link></li>
            <li>Atendimento presencial em Tamboré, com hora marcada</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-3">Horários</h2>
          <p className="text-ink/85">Segunda a sexta, das 9h às 18h. Sábados sob agendamento.</p>
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-3">Prazos</h2>
          <ul className="list-disc list-inside space-y-1 text-ink/85">
            <li>Primeiro retorno: até 24 horas úteis.</li>
            <li>Envio de opções curadas: até 3 dias úteis após o briefing.</li>
            <li>Análise cadastral: em média 2 a 5 dias úteis.</li>
            <li>Resposta a demandas contratuais em andamento: até 2 dias úteis.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-3">Boas práticas</h2>
          <ul className="list-disc list-inside space-y-1 text-ink/85">
            <li>Linguagem clara, sem jargão desnecessário.</li>
            <li>Sigilo integral sobre informações compartilhadas.</li>
            <li>Registro escrito das principais interações.</li>
            <li>Acompanhamento consultivo até o fechamento e após.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-3">Compromissos</h2>
          <p className="text-ink/85">
            Trabalhamos com transparência de preço, comparativos reais, contratos revisados e
            respeito ao tempo de decisão do cliente. Veja também nossa página de{" "}
            <Link to="/transparencia" className="underline underline-offset-4">transparência</Link>.
          </p>
        </section>
      </div>
    </SectionPage>
  );
}
