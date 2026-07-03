import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";

const URL = "https://alphaville-vantage.lovable.app/lgpd";
const TITLE = "LGPD — Direitos do Titular | S.A Imóveis Alphaville";
const DESC =
  "Central LGPD da S.A Imóveis Alphaville: exerça seus direitos de acesso, correção, portabilidade, anonimização e exclusão de dados pessoais.";

const RIGHTS = [
  { t: "Confirmação e acesso", d: "Confirmar a existência e acessar seus dados pessoais tratados por nós." },
  { t: "Correção", d: "Solicitar correção de dados incompletos, inexatos ou desatualizados." },
  { t: "Anonimização, bloqueio ou eliminação", d: "Solicitar anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade." },
  { t: "Portabilidade", d: "Requerer a portabilidade dos dados a outro fornecedor de serviço, observados os segredos comercial e industrial." },
  { t: "Eliminação", d: "Solicitar a eliminação dos dados tratados com base no seu consentimento, ressalvadas hipóteses de guarda legal." },
  { t: "Informação de compartilhamento", d: "Obter informações sobre entidades públicas e privadas com as quais compartilhamos seus dados." },
  { t: "Revogação do consentimento", d: "Revogar o consentimento a qualquer momento, quando o tratamento estiver baseado nele." },
  { t: "Revisão de decisões automatizadas", d: "Solicitar revisão de decisões tomadas unicamente com base em tratamento automatizado que afetem seus interesses." },
];

export const Route = createFileRoute("/lgpd")({
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
  component: Lgpd,
});

function Lgpd() {
  return (
    <SectionPage
      eyebrow="Proteção de dados"
      title="LGPD — Direitos do titular"
      lead="A Lei Geral de Proteção de Dados garante ao titular controle sobre seus dados pessoais. Aqui você encontra seus direitos, base legal do tratamento e como solicitar cada exercício."
      breadcrumbs={[{ label: "LGPD" }]}
    >
      <div className="max-w-3xl space-y-12">
        <section>
          <h2 className="font-serif text-3xl mb-6">Seus direitos</h2>
          <div className="space-y-6">
            {RIGHTS.map((r) => (
              <div key={r.t} className="border-t border-ink/10 pt-4">
                <h3 className="font-serif text-lg mb-1">{r.t}</h3>
                <p className="text-ink/85 leading-relaxed">{r.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-serif text-3xl mb-4">Base legal</h2>
          <p className="text-ink/85 leading-relaxed">
            Realizamos o tratamento com base em execução de contrato, cumprimento de obrigação legal
            ou regulatória, legítimo interesse e consentimento, conforme a finalidade específica.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-3xl mb-4">Como solicitar</h2>
          <p className="text-ink/85 leading-relaxed">
            Envie sua solicitação para{" "}
            <a href="mailto:contato@saimoveisalphaville.com.br" className="underline underline-offset-4">contato@saimoveisalphaville.com.br</a>
            {" "}informando o direito que deseja exercer e dados que permitam a sua identificação.
            Responderemos no prazo legal.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-3xl mb-4">Documentos relacionados</h2>
          <ul className="space-y-2 text-ink/85">
            <li><Link to="/politica-de-privacidade" className="underline underline-offset-4">Política de Privacidade</Link></li>
            <li><Link to="/politica-de-cookies" className="underline underline-offset-4">Política de Cookies</Link></li>
            <li><Link to="/termos-de-uso" className="underline underline-offset-4">Termos de Uso</Link></li>
          </ul>
        </section>
      </div>
    </SectionPage>
  );
}
