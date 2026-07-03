import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/politica-de-cookies")({
  head: () => ({
    meta: [
      { title: "Política de Cookies — S.A Imóveis Alphaville" },
      {
        name: "description",
        content:
          "Saiba como a S.A Imóveis Alphaville utiliza cookies e tecnologias semelhantes para melhorar a navegação em nosso portal editorial.",
      },
      { property: "og:title", content: "Política de Cookies — S.A Imóveis Alphaville" },
      {
        property: "og:description",
        content:
          "Saiba como a S.A Imóveis Alphaville utiliza cookies e tecnologias semelhantes para melhorar a navegação em nosso portal editorial.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://alphaville-vantage.lovable.app/politica-de-cookies" },
      { name: "robots", content: "noindex" },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://alphaville-vantage.lovable.app/politica-de-cookies",
      },
    ],
  }),
  component: CookiesPolicyPage,
});

function CookiesPolicyPage() {
  return (
    <SiteLayout>
      <section className="px-6 pt-16 md:pt-24 pb-12 border-b border-ink/8">
        <div className="max-w-4xl mx-auto">
          <nav aria-label="Trilha" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-ink transition-colors">
                  Início
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden>/</span>
                <span className="text-ink">Política de Cookies</span>
              </li>
            </ol>
          </nav>

          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">
            Transparência
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium leading-[1.05] tracking-tight text-balance">
            Política de Cookies
          </h1>
          <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-[60ch] text-pretty">
            Esta página explica como a S.A Imóveis Alphaville utiliza cookies e tecnologias
            similares em nosso portal editorial. Nosso objetivo é manter a navegação segura,
            fluida e relevante para quem busca informações sobre Alphaville e região.
          </p>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto space-y-14">
          <article>
            <h2 className="font-serif text-2xl mb-4">1. O que são cookies?</h2>
            <p className="text-ink/85 leading-relaxed">
              Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você
              visita um site. Eles ajudam a lembrar preferências de navegação, contar visitantes e
              entender como as páginas são utilizadas, sem identificar pessoalmente o usuário.
            </p>
          </article>

          <article>
            <h2 className="font-serif text-2xl mb-4">2. Categorias de cookies que utilizamos</h2>
            <ul className="list-disc list-inside space-y-2 text-ink/85 leading-relaxed">
              <li>
                <strong>Essenciais:</strong> necessários para o funcionamento do site, autenticação
                e segurança. Não podem ser desativados sem comprometer a navegação.
              </li>
              <li>
                <strong>Analíticos:</strong> medem uso agregado (páginas mais acessadas, origem do
                tráfego, desempenho) para melhorarmos a experiência.
              </li>
              <li>
                <strong>Marketing:</strong> quando aplicáveis, ajudam a mensurar campanhas e
                comunicações. Não vendemos dados a terceiros para publicidade.
              </li>
              <li>
                <strong>Preferências:</strong> lembram escolhas do visitante, como filtros,
                idioma e configurações de exibição.
              </li>
            </ul>
          </article>

          <article>
            <h2 className="font-serif text-2xl mb-4">3. Cookies de terceiros</h2>
            <p className="text-ink/85 leading-relaxed">
              Podemos utilizar serviços de terceiros para hospedagem, análise de tráfego e
              segurança. Esses parceiros podem depositar cookies próprios de acordo com suas
              políticas. Não compartilhamos dados pessoais dos visitantes com fins publicitários.
            </p>
          </article>

          <article>
            <h2 className="font-serif text-2xl mb-4">4. Seus direitos e escolhas</h2>
            <p className="text-ink/85 leading-relaxed mb-4">
              Você pode gerenciar os cookies pelo próprio navegador, bloqueando, limitando ou
              apagando os arquivos já armazenados. Abaixo, links de suporte dos principais
              navegadores:
            </p>
            <ul className="list-disc list-inside space-y-2 text-ink/85 leading-relaxed">
              <li>
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-ink"
                >
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  href="https://support.mozilla.org/pt-BR/kb/cookies-informacoes-armazenadas-por-sites"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-ink"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  href="https://support.apple.com/pt-br/HT201265"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-ink"
                >
                  Safari
                </a>
              </li>
              <li>
                <a
                  href="https://support.microsoft.com/pt-br/microsoft-edge/gerenciar-cookies-no-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-ink"
                >
                  Microsoft Edge
                </a>
              </li>
            </ul>
          </article>

          <article>
            <h2 className="font-serif text-2xl mb-4">5. Alterações nesta política</h2>
            <p className="text-ink/85 leading-relaxed">
              Esta política pode ser atualizada para refletir mudanças tecnológicas ou legais. A
              data da última revisão aparece ao final desta página. Recomendamos consultá-la
              periodicamente.
            </p>
          </article>

          <article>
            <h2 className="font-serif text-2xl mb-4">6. Contato</h2>
            <p className="text-ink/85 leading-relaxed">
              Dúvidas sobre o uso de cookies podem ser enviadas por e-mail para{" "}
              <a
                href="mailto:contato@saimoveisalphaville.com.br"
                className="underline underline-offset-4 hover:text-ink"
              >
                contato@saimoveisalphaville.com.br
              </a>
              .
            </p>
          </article>

          <div className="border-t border-ink/10 pt-8">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Última atualização: julho de 2026
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
