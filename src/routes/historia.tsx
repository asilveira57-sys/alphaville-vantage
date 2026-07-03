import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";

const URL = "https://alphaville-vantage.lovable.app/historia";
const TITLE = "Nossa História — S.A Imóveis Alphaville";
const DESC =
  "A trajetória da Padilha Assessoria em Vendas em Alphaville, Tamboré, Barueri e Santana de Parnaíba: origens, marcos, evolução e próximos passos.";

const TIMELINE = [
  { year: "Início", title: "Origem em Alphaville", text: "A empresa nasce da vivência direta com a expansão de Alphaville e Tamboré, atendendo primeiros clientes com foco em locação de alto padrão." },
  { year: "Consolidação", title: "Ampliação de serviços", text: "Adicionamos venda, permuta, administração e apoio a reformas — construindo um atendimento integrado para o ciclo completo do imóvel." },
  { year: "Regionalização", title: "Cobertura do eixo Oeste", text: "Estendemos a atuação para Barueri e Santana de Parnaíba, mapeando condomínios, escolas, empresas e bairros da região." },
  { year: "Editorial", title: "Portal de conteúdo", text: "Lançamos um portal editorial próprio com guias de bairros, condomínios, mercado e cultura regional." },
  { year: "Presente", title: "Consultoria e curadoria", text: "Trabalhamos com curadoria de imóveis, dados de mercado e conteúdo especializado para famílias, investidores e empresas." },
  { year: "Futuro", title: "Referência regional", text: "Seguimos ampliando cobertura editorial, tecnologia de busca e profundidade de atendimento — sem perder o cuidado artesanal com cada cliente." },
];

export const Route = createFileRoute("/historia")({
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
  component: Historia,
});

function Historia() {
  return (
    <SectionPage
      eyebrow="Institucional"
      title="Nossa história"
      lead="Da vivência local à consultoria regional. A trajetória da S.A Imóveis Alphaville é feita de bairros percorridos, condomínios acompanhados e famílias atendidas ao longo de mais de uma década."
      breadcrumbs={[{ label: "Quem somos", to: "/quem-somos" }, { label: "História" }]}
    >
      <ol className="relative border-l border-ink/15 space-y-12 pl-8 max-w-3xl">
        {TIMELINE.map((item, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[41px] top-1.5 h-3 w-3 rounded-full bg-brand-yellow border border-ink/20" />
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">{item.year}</p>
            <h2 className="font-serif text-2xl mb-2">{item.title}</h2>
            <p className="text-ink/85 leading-relaxed">{item.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-16 border-t border-ink/10 pt-8 max-w-3xl">
        <p className="text-sm text-muted-foreground">
          Saiba mais sobre <Link to="/quem-somos" className="underline underline-offset-4 hover:text-ink">quem somos</Link>,
          {" "}
          <Link to="/como-trabalhamos" className="underline underline-offset-4 hover:text-ink">como trabalhamos</Link> ou entre em
          {" "}
          <Link to="/contato" className="underline underline-offset-4 hover:text-ink">contato</Link>.
        </p>
      </div>
    </SectionPage>
  );
}
