import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { FinancingSimulator } from "@/components/financing-simulator";
import { SiteLayout } from "@/components/site-layout";
import { listFinancingBanks, getFinancingSettings } from "@/lib/financing.functions";
import { SITE_URL } from "@/lib/site";
import { FINANCING_PAGE } from "@/lib/financing-page";

const TITLE = "Simulador de financiamento imobiliário SAC e Price | S.A Imóveis Alphaville";
const DESCRIPTION = "Simule entrada, prazo e parcelas do financiamento imobiliário com taxas dos bancos cadastrados. Compare SAC e Price e receba sua simulação por e-mail.";
const URL = `${SITE_URL}${FINANCING_PAGE}`;
const banksQuery = queryOptions({ queryKey: ["financing-banks"], queryFn: () => listFinancingBanks(), staleTime: 5 * 60_000 });
const settingsQuery = queryOptions({ queryKey: ["financing-settings"], queryFn: () => getFinancingSettings(), staleTime: 5 * 60_000 });
const FAQ = [
  { question: "Qual é a diferença entre SAC e Price?", answer: "No SAC, a amortização é constante e as parcelas tendem a diminuir ao longo do prazo. Na Price, a parcela calculada é constante para uma taxa fixa. Correção monetária, seguros e tarifas podem alterar o valor cobrado em ambos os sistemas." },
  { question: "Qual é a entrada mínima para financiar um imóvel?", answer: "A entrada depende do banco, da modalidade, do imóvel e da análise de crédito. O simulador mostra o mínimo cadastrado para o banco escolhido. Confirme as condições vigentes com a instituição antes de assumir compromissos." },
  { question: "Quais documentos costumam ser solicitados?", answer: "Em geral, documento de identificação, CPF, comprovantes de renda e de residência, comprovante de estado civil e declaração de Imposto de Renda. O banco também analisa a matrícula e os documentos do imóvel e do vendedor e pode pedir documentos adicionais." },
  { question: "Posso usar meu FGTS na entrada?", answer: "O uso do FGTS depende das regras vigentes para o trabalhador, o imóvel e a operação. Entre os requisitos estão tempo de trabalho sob o regime do FGTS e restrições à propriedade e ao financiamento de outros imóveis. A disponibilidade deve ser confirmada pelo agente financeiro; o valor de FGTS indicado aqui é apenas um exemplo." },
  { question: "A simulação garante a aprovação do financiamento?", answer: "Não. Os resultados são estimativas, não uma proposta de crédito. A aprovação, as taxas e o custo efetivo total dependem da análise do banco. Seguros, tarifas e eventuais indexadores não estão incluídos nestes cálculos." },
];

export const Route = createFileRoute("/simulador-de-financiamento")({
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.ensureQueryData(banksQuery), context.queryClient.ensureQueryData(settingsQuery)]);
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })) }) },
      { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` }, { "@type": "ListItem", position: 2, name: "Simulador de financiamento", item: URL }] }) },
    ],
  }),
  component: FinancingPage,
});

function FinancingPage() {
  const { data: banks } = useSuspenseQuery(banksQuery);
  useSuspenseQuery(settingsQuery);
  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-5 pt-10 pb-12 sm:px-8">
        <nav aria-label="Caminho da página" className="mb-8 text-xs text-muted-foreground"><Link to="/" className="underline underline-offset-4">Início</Link><span className="mx-2">/</span>Simulador de financiamento</nav>
        <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Planeje sua compra</p>
        <h1 className="max-w-4xl font-display text-4xl text-ink sm:text-5xl">Simulador de financiamento imobiliário</h1>
        <p className="mt-5 mb-9 max-w-3xl text-base leading-relaxed text-ink/75">Encontre uma parcela que faça sentido para o seu momento. Informe o valor do imóvel, compare SAC e Price e avalie as condições dos bancos antes de escolher seu próximo endereço.</p>
        <FinancingSimulator standalone />
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <h2 className="font-display text-3xl">Taxas dos bancos</h2>
          <p className="mt-3 mb-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">Taxas de referência cadastradas pela S.A Imóveis. A data indica a última atualização do cadastro de cada banco, não uma garantia da taxa oferecida. Consulte o custo efetivo total (CET) antes de contratar.</p>
          {banks.length ? <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="border-b border-border"><tr><th className="py-3 pr-4">Banco</th><th className="py-3 pr-4">Taxa anual</th><th className="py-3 pr-4">Entrada mínima</th><th className="py-3">Atualização</th></tr></thead><tbody>{banks.map((bank) => <tr key={bank.id} className="border-b border-border"><td className="py-4 pr-4 font-semibold">{bank.name}</td><td className="py-4 pr-4">{Number(bank.annual_rate).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%</td><td className="py-4 pr-4">{Number(bank.min_down_payment_pct)}%</td><td className="py-4">{bank.updated_at ? new Date(bank.updated_at).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Não informada"}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">Nenhum banco cadastrado disponível. O simulador usa a taxa de referência configurada.</p>}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-2">
          <div><h2 className="font-display text-3xl">SAC ou Price?</h2><p className="mt-4 text-sm leading-7 text-ink/75">No <strong>SAC</strong>, você amortiza o mesmo valor todos os meses. Os juros incidem sobre um saldo cada vez menor, por isso a primeira parcela costuma ser maior e as seguintes diminuem.</p><p className="mt-3 text-sm leading-7 text-ink/75">Na <strong>Price</strong>, a parcela calculada permanece constante para uma taxa fixa. A composição muda com o tempo: no início há mais juros; depois, mais amortização. Compare o total de juros e a parcela inicial, não apenas o prazo.</p></div>
          <div><h2 className="font-display text-3xl">Entrada e planejamento</h2><p className="mt-4 text-sm leading-7 text-ink/75">A entrada mínima varia conforme o banco escolhido e a análise de crédito. Uma entrada maior reduz o saldo financiado. Reserve também recursos para ITBI, registro, avaliação do imóvel e demais despesas da compra.</p><p className="mt-3 text-sm leading-7 text-ink/75">A renda sugerida é uma referência de planejamento. Outras dívidas, composição de renda, idade e condições do imóvel podem influenciar a aprovação.</p></div>
          <div><h2 className="font-display text-3xl">Documentos para começar</h2><p className="mt-4 text-sm leading-7 text-ink/75">Separe identificação e CPF, comprovantes de renda e residência, estado civil e Imposto de Renda. Para o imóvel, matrícula atualizada e documentação do vendedor. A lista definitiva será informada pelo banco.</p></div>
          <div><h2 className="font-display text-3xl">Uso do FGTS</h2><p className="mt-4 text-sm leading-7 text-ink/75">O FGTS pode compor a entrada quando trabalhador, imóvel e operação atendem às regras vigentes. A opção no simulador usa um valor ilustrativo, não consulta seu saldo nem confirma elegibilidade. Valide a possibilidade com o agente financeiro.</p></div>
        </div>
        <div className="mt-14 border-t border-border pt-10"><h2 className="mb-6 font-display text-3xl">Perguntas frequentes</h2>{FAQ.map((item) => <details key={item.question} className="border-b border-border py-5"><summary className="cursor-pointer pr-4 text-base font-semibold">{item.question}</summary><p className="mt-4 max-w-4xl text-sm leading-7 text-ink/75">{item.answer}</p></details>)}</div>
      </section>
    </SiteLayout>
  );
}