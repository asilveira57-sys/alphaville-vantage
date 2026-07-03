import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";

const URL = "https://alphaville-vantage.lovable.app/servicos";
const TITLE = "Serviços — S.A Imóveis Alphaville";
const DESC =
  "Locação, venda, permuta, administração e reforma de imóveis em Alphaville, Tamboré, Barueri e Santana de Parnaíba. Conheça cada serviço em detalhes.";

const SERVICES = [
  { title: "Locação", text: "Locação residencial e comercial com curadoria de imóveis, análise cadastral criteriosa, contratos revisados e acompanhamento durante toda a vigência." },
  { title: "Venda", text: "Assessoria completa de venda: precificação baseada em dados reais, marketing dirigido ao público certo, visitas qualificadas e negociação estruturada." },
  { title: "Permuta", text: "Estruturação de operações de permuta entre imóveis residenciais e comerciais, incluindo avaliação, equalização financeira e formalização jurídica." },
  { title: "Administração", text: "Administração patrimonial completa: cobrança, repasse, gestão de manutenções, revisões contratuais e relatórios periódicos ao proprietário." },
  { title: "Reforma", text: "Coordenação de reformas em parceria com profissionais de confiança, do projeto ao entregue-chave, alinhado ao padrão da região." },
];

const FAQ = [
  { q: "Vocês atendem fora de Alphaville?", a: "Nossa atuação é focada em Alphaville, Tamboré, Barueri e Santana de Parnaíba. Para outras regiões, avaliamos caso a caso." },
  { q: "Como é definido o valor de venda ou aluguel?", a: "Utilizamos comparativos de mercado, características do imóvel, condomínio, momento do ciclo e análise de demanda para chegar a um preço realista." },
  { q: "Vocês trabalham com imóveis de terceiros?", a: "Sim, trabalhamos com carteira própria e parcerias, sempre com autorização formal do proprietário." },
  { q: "Como funciona a administração de imóveis?", a: "Cuidamos de cobrança, repasse, manutenções, vistorias, renovação contratual e comunicação com o inquilino, com relatórios periódicos." },
];

export const Route = createFileRoute("/servicos")({
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Servicos,
});

function Servicos() {
  return (
    <SectionPage
      eyebrow="O que oferecemos"
      title="Serviços"
      lead="Um portfólio integrado para o ciclo completo do imóvel: da primeira visita à administração pós-mudança, passando por venda, permuta e reforma."
      breadcrumbs={[{ label: "Serviços" }]}
    >
      <div className="grid gap-10 md:grid-cols-2 max-w-5xl">
        {SERVICES.map((s) => (
          <article key={s.title} className="border-t border-ink/10 pt-6">
            <h2 className="font-serif text-2xl mb-3">{s.title}</h2>
            <p className="text-ink/85 leading-relaxed">{s.text}</p>
          </article>
        ))}
      </div>

      <div className="mt-20 max-w-3xl">
        <h2 className="font-serif text-3xl mb-6">Diferenciais</h2>
        <ul className="space-y-2 text-ink/85 leading-relaxed list-disc list-inside">
          <li>Foco regional exclusivo e profundo.</li>
          <li>Portal editorial com guias de bairros e condomínios.</li>
          <li>Consultores com vivência local.</li>
          <li>Atendimento integrado do início ao pós-venda.</li>
        </ul>
      </div>

      <div className="mt-20 max-w-3xl">
        <h2 className="font-serif text-3xl mb-6">Perguntas frequentes</h2>
        <div className="space-y-6">
          {FAQ.map((f) => (
            <div key={f.q} className="border-t border-ink/10 pt-4">
              <h3 className="font-serif text-lg mb-2">{f.q}</h3>
              <p className="text-ink/85 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Veja todas as{" "}
          <Link to="/perguntas-frequentes" className="underline underline-offset-4 hover:text-ink">perguntas frequentes</Link> ou{" "}
          <Link to="/contato" className="underline underline-offset-4 hover:text-ink">fale conosco</Link>.
        </p>
      </div>
    </SectionPage>
  );
}
