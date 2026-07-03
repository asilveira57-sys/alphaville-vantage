import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";

const URL = "https://alphaville-vantage.lovable.app/como-trabalhamos";
const TITLE = "Como Trabalhamos — Metodologia S.A Imóveis Alphaville";
const DESC =
  "Metodologia consultiva da S.A Imóveis Alphaville: escuta, curadoria, visita, negociação, contratos e pós-venda para locação, venda, permuta e administração.";

const STEPS = [
  { n: "01", title: "Escuta e briefing", text: "Entendemos objetivo, prazo, orçamento, perfil da família ou investidor, preferências de bairro, condomínio e programa do imóvel." },
  { n: "02", title: "Curadoria", text: "Selecionamos opções compatíveis a partir da nossa base regional, incluindo imóveis fora do mercado aberto quando fizer sentido." },
  { n: "03", title: "Visitas guiadas", text: "Agendamos visitas com contexto: entorno, condomínio, mobilidade, escolas e serviços. Sem pressa e sem pressão comercial." },
  { n: "04", title: "Análise técnica e negociação", text: "Comparativos de mercado, análise documental, negociação estruturada e transparência total nas condições." },
  { n: "05", title: "Contratos e formalização", text: "Contratos claros, revisados juridicamente, com garantias adequadas ao tipo de operação (locação, venda, permuta ou administração)." },
  { n: "06", title: "Pós-atendimento", text: "Acompanhamento após a assinatura: mudança, administração, reforma, revisões contratuais e suporte contínuo." },
];

export const Route = createFileRoute("/como-trabalhamos")({
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
  component: ComoTrabalhamos,
});

function ComoTrabalhamos() {
  return (
    <SectionPage
      eyebrow="Metodologia"
      title="Como trabalhamos"
      lead="Um método consultivo em seis etapas, aplicado a locação, venda, permuta, administração e reforma. Padrão comum, cuidado individual em cada atendimento."
      breadcrumbs={[{ label: "Como trabalhamos" }]}
    >
      <div className="grid gap-10 md:grid-cols-2 max-w-5xl">
        {STEPS.map((s) => (
          <article key={s.n} className="border-t border-ink/10 pt-6">
            <p className="font-serif text-4xl text-brand-yellow mb-3">{s.n}</p>
            <h2 className="font-serif text-2xl mb-3">{s.title}</h2>
            <p className="text-ink/85 leading-relaxed">{s.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-16 border-t border-ink/10 pt-8 max-w-3xl">
        <h2 className="font-serif text-2xl mb-4">Padrões de qualidade</h2>
        <ul className="space-y-2 text-ink/85 leading-relaxed list-disc list-inside">
          <li>Retorno em até 24 horas úteis para todo contato inicial.</li>
          <li>Revisão jurídica em todos os contratos.</li>
          <li>Sigilo integral sobre dados e intenções do cliente.</li>
          <li>Registro documental completo em cada etapa.</li>
          <li>Comunicação direta com o consultor responsável.</li>
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">
          Veja também <Link to="/servicos" className="underline underline-offset-4 hover:text-ink">nossos serviços</Link>,
          {" "}
          <Link to="/politica-de-atendimento" className="underline underline-offset-4 hover:text-ink">política de atendimento</Link> ou
          {" "}
          <Link to="/contato" className="underline underline-offset-4 hover:text-ink">fale conosco</Link>.
        </p>
      </div>
    </SectionPage>
  );
}
