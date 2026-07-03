import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";

const URL = "https://alphaville-vantage.lovable.app/termos-de-uso";
const TITLE = "Termos de Uso — S.A Imóveis Alphaville";
const DESC =
  "Termos e condições de uso do portal da S.A Imóveis Alphaville: responsabilidades, direitos autorais, limitações, links externos e legislação aplicável.";

export const Route = createFileRoute("/termos-de-uso")({
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
  component: Terms,
});

function Terms() {
  return (
    <SectionPage
      eyebrow="Legal"
      title="Termos de Uso"
      lead="Ao navegar por este portal, você concorda com as condições descritas abaixo. Leia com atenção antes de utilizar nossos serviços ou conteúdos."
      breadcrumbs={[{ label: "Termos de Uso" }]}
    >
      <div className="prose prose-neutral max-w-3xl prose-headings:font-serif prose-headings:text-ink prose-p:text-ink/85">
        <h2>1. Objeto</h2>
        <p>Este documento regula o uso do portal da S.A Imóveis Alphaville, operado pela Padilha Assessoria em Vendas Ltda.</p>

        <h2>2. Uso do site</h2>
        <p>O usuário compromete-se a utilizar o portal de forma lícita, sem violar direitos de terceiros nem tentar acessar áreas restritas sem autorização.</p>

        <h2>3. Responsabilidades</h2>
        <p>As informações veiculadas têm caráter informativo. Valores, disponibilidade e características dos imóveis podem sofrer alterações sem aviso prévio.</p>

        <h2>4. Direitos autorais</h2>
        <p>Textos, imagens, marcas, layout e demais elementos são de titularidade da empresa ou de terceiros licenciados. É proibida a reprodução sem autorização.</p>

        <h2>5. Limitações</h2>
        <p>Não nos responsabilizamos por indisponibilidades temporárias, falhas de conexão do usuário ou por conteúdo de terceiros acessível por links externos.</p>

        <h2>6. Conteúdo</h2>
        <p>Buscamos manter as informações atualizadas, mas não garantimos ausência integral de erros. Correções podem ser realizadas a qualquer momento.</p>

        <h2>7. Links externos</h2>
        <p>Links para sites de terceiros são fornecidos como cortesia e não implicam endosso de conteúdo, produtos ou serviços de outras empresas.</p>

        <h2>8. Alterações</h2>
        <p>Estes termos podem ser alterados a qualquer tempo. A continuidade do uso após alterações representa aceitação da nova versão.</p>

        <h2>9. Legislação e foro</h2>
        <p>Aplica-se a legislação brasileira. Fica eleito o foro da comarca de Santana de Parnaíba/SP para dirimir eventuais controvérsias.</p>

        <h2>10. Contato</h2>
        <p>Dúvidas sobre estes termos: <a href="mailto:contato@saimoveisalphaville.com.br">contato@saimoveisalphaville.com.br</a>.</p>

        <p>Veja também: <Link to="/politica-de-privacidade">Política de Privacidade</Link>, <Link to="/politica-de-cookies">Política de Cookies</Link> e <Link to="/lgpd">LGPD</Link>.</p>

        <p className="text-sm text-muted-foreground">Última atualização: julho de 2026.</p>
      </div>
    </SectionPage>
  );
}
