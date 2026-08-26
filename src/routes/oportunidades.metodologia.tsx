import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import {
  MIN_SAMPLE,
  QUALIFYING_DELTA_PCT,
  COMPARABLE_MAX_AGE_MONTHS,
} from "@/lib/opportunity-valuation";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const TITLE = "Metodologia da Vitrine de Oportunidades — S.A Imóveis Alphaville";
const DESCRIPTION =
  "Como a S.A Imóveis seleciona os imóveis da Vitrine de Oportunidades: critério de entrada, cálculo do R$/m² de referência, amostra mínima, fonte dos dados e limitações assumidas.";

export const Route = createFileRoute("/oportunidades/metodologia")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: `${SITE_URL}/oportunidades/metodologia` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/oportunidades/metodologia` }],
  }),
  component: MethodologyPage,
});

const threshold = Math.abs(QUALIFYING_DELTA_PCT);

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-ink/10 py-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {n}
      </p>
      <h2 className="font-serif mt-3 text-2xl leading-tight text-balance md:text-3xl">{title}</h2>
      <div className="mt-5 max-w-[68ch] space-y-4 leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function MethodologyPage() {
  return (
    <SiteLayout>
      <section className="border-b border-ink/10 px-6 pb-12 pt-16">
        <div className="mx-auto max-w-4xl">
          <nav aria-label="Trilha de navegação" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-ink">
                  Início
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden>/</span>
                <Link to={"/oportunidades" as never} className="hover:text-ink">
                  Oportunidades
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden>/</span>
                <span className="text-ink">Metodologia</span>
              </li>
            </ol>
          </nav>

          <h1 className="font-serif text-3xl leading-tight text-balance md:text-5xl">
            Como escolhemos os imóveis da vitrine
          </h1>
          <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-muted-foreground text-pretty">
            Publicamos o critério inteiro, incluindo o que ele não consegue provar. Uma vitrine que
            diz “abaixo do mercado” sem dizer contra o quê não está informando — está apenas
            afirmando.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6 pb-8">
        <Section n="01" title="Quem entra na vitrine">
          <p>
            A seleção é manual. Nossa equipe avalia o acervo e escolhe imóveis que considera bem
            posicionados — por preço, por características ou por raridade dentro do residencial. O
            texto de curadoria que aparece em cada anúncio é a leitura da equipe sobre aquele
            imóvel.
          </p>
          <p>
            A vitrine tem <strong>teto de oito imóveis publicados</strong> ao mesmo tempo, e cada
            seleção tem prazo de validade: passado o prazo, o imóvel sai automaticamente.
          </p>
        </Section>

        <Section n="02" title="Quando aparece o selo de preço">
          <p>
            Alguns imóveis recebem um selo com percentual — por exemplo,{" "}
            <em>“R$/m² 14% abaixo da referência”</em>. Esse selo não é opinião comercial: é o
            resultado de um cálculo, e ele só aparece quando todas as condições abaixo se cumprem.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              O valor por metro quadrado do imóvel está pelo menos{" "}
              <strong>{threshold}% abaixo</strong> da referência apurada.
            </li>
            <li>
              A referência é a <strong>mediana</strong> — não a média — do R$/m² de imóveis
              comparáveis. Usamos mediana porque um único anúncio fora da curva distorce a média e
              inflaria artificialmente o desconto.
            </li>
            <li>
              Há no mínimo <strong>{MIN_SAMPLE} imóveis comparáveis</strong> na amostra. Abaixo
              disso, o imóvel pode continuar na vitrine pela curadoria, mas sem selo de preço.
            </li>
          </ul>
          <p>
            O selo sempre vem acompanhado do número de comparáveis, do recorte usado, da fonte e da
            data da apuração. Se algum desses dados não aparecer junto do percentual, o selo não
            deveria estar ali.
          </p>
        </Section>

        <Section n="03" title="O que conta como comparável">
          <p>
            Buscamos do recorte mais estrito para o mais largo, e paramos no primeiro que fecha a
            amostra mínima:
          </p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>mesmo condomínio, mesmo tipo de imóvel e mesmo número de dormitórios;</li>
            <li>
              mesmo condomínio, mesmo tipo, dormitórios com variação de um para mais ou menos;
            </li>
            <li>mesmo bairro, mesmo tipo, dormitórios com a mesma variação.</li>
          </ol>
          <p>
            Anúncios sem atualização há mais de {COMPARABLE_MAX_AGE_MONTHS} meses são descartados. O
            recorte efetivamente usado aparece escrito no anúncio, então você sabe se a comparação
            foi feita dentro do condomínio ou do bairro.
          </p>
        </Section>

        <Section n="04" title="De onde vêm os dados — e o que eles não são">
          <p>
            A referência vem do <strong>nosso próprio acervo</strong>, e são{" "}
            <strong>preços de anúncio</strong>, não valores de transações fechadas. Essa distinção
            importa e por isso está aqui, não numa nota de rodapé.
          </p>
          <p>
            Preço de anúncio costuma ser mais alto que o preço pelo qual o imóvel efetivamente se
            vende. Isso significa que a nossa referência tende a ser conservadora como retrato do
            mercado real — e é justamente por isso que o selo diz{" "}
            <strong>“abaixo da referência”</strong>, e não “abaixo do mercado”. São coisas
            diferentes, e chamar uma pela outra seria uma comparação que não se sustenta.
          </p>
          <p>
            Índices públicos como o FipeZAP medem preço de oferta com granularidade de bairro. Em
            Alphaville, a variação entre condomínios costuma ser maior que a variação entre bairros,
            o que torna essa granularidade pouco útil para um imóvel específico. Por isso eles não
            servem de base para o nosso selo — no máximo, de contexto.
          </p>
        </Section>

        <Section n="05" title="As mensagens sobre queda de preço e procura">
          <p>
            Nenhuma delas é escrita à mão. Cada uma corresponde a um registro do sistema, com data:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>“Preço reduzido em R$ X em DD/MM”</strong> — o anúncio mudou de preço nessa
              data, e a alteração ficou registrada no histórico do imóvel.
            </li>
            <li>
              <strong>“Alta procura — N visualizações em 7 dias”</strong> — contagem de acessos à
              página do imóvel no período indicado. O número e o período aparecem sempre juntos.
            </li>
            <li>
              <strong>“Proposta em análise desde DD/MM”</strong> — existe proposta registrada em
              negociação. O aviso expira sozinho depois de sete dias.
            </li>
          </ul>
          <p>
            Não usamos contagem regressiva, “última unidade” nem “vende rápido”. Cada imóvel usado é
            único, então não há estoque a esgotar — e previsão de velocidade de venda não é fato
            verificável.
          </p>
        </Section>

        <Section n="06" title="Com que frequência revisamos">
          <p>
            As apurações são refeitas periodicamente e sempre que a curadoria muda. Cada apuração
            fica arquivada com os comparáveis que usou, a data e o método — inclusive as que não
            geraram selo. A data que aparece no anúncio é a da apuração vigente, não a de hoje.
          </p>
          <p>
            Encontrou algo que não fecha?{" "}
            <Link to="/contato" className="underline">
              Fale com a gente
            </Link>
            . Corrigimos e reapuramos.
          </p>
        </Section>
      </div>

      <InstitutionalBlock />
    </SiteLayout>
  );
}
