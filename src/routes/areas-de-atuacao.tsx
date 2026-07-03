import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";

const URL = "https://alphaville-vantage.lovable.app/areas-de-atuacao";
const TITLE = "Áreas de Atuação — S.A Imóveis Alphaville";
const DESC =
  "Onde atuamos: Alphaville, Tamboré, Barueri e Santana de Parnaíba. Cobertura completa de condomínios residenciais, empresariais e comerciais.";

const AREAS = [
  { name: "Alphaville", text: "Condomínios residenciais e empresariais em Barueri e Santana de Parnaíba, incluindo o eixo tradicional dos Alphavilles residenciais e o Alphaville Empresarial.", to: "/guia-alphaville" },
  { name: "Tamboré", text: "Residenciais Tamboré, Genesis, Aldeia da Serra e entorno — casas e terrenos em condomínios de médio e alto padrão.", to: "/guia-tambore" },
  { name: "Barueri", text: "Bairros residenciais e áreas empresariais estratégicas próximas ao eixo Castelo Branco e Marcos Penteado.", to: "/guia-barueri" },
  { name: "Santana de Parnaíba", text: "Condomínios consolidados, novos empreendimentos e áreas em expansão, com foco em qualidade de vida e valorização.", to: "/guia-santana-de-parnaiba" },
];

export const Route = createFileRoute("/areas-de-atuacao")({
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
  component: Areas,
});

function Areas() {
  return (
    <SectionPage
      eyebrow="Território"
      title="Áreas de atuação"
      lead="Nossa cobertura é regional e profunda. Concentramos conhecimento, presença e atendimento em quatro cidades e dezenas de condomínios do eixo Alphaville."
      breadcrumbs={[{ label: "Áreas de atuação" }]}
    >
      <div className="grid gap-10 md:grid-cols-2 max-w-5xl">
        {AREAS.map((a) => (
          <article key={a.name} className="border-t border-ink/10 pt-6">
            <h2 className="font-serif text-2xl mb-3">{a.name}</h2>
            <p className="text-ink/85 leading-relaxed mb-4">{a.text}</p>
            <Link to={a.to} className="text-sm underline underline-offset-4 hover:text-ink">Ver guia da região →</Link>
          </article>
        ))}
      </div>

      <div className="mt-16 border-t border-ink/10 pt-8 max-w-3xl">
        <h2 className="font-serif text-2xl mb-4">Formato do atendimento</h2>
        <p className="text-ink/85 leading-relaxed mb-4">
          Atendimento presencial na região, visitas agendadas com antecedência e suporte remoto por
          telefone, WhatsApp e e-mail. Para clientes de fora do estado ou do país, oferecemos
          visitas virtuais e representação em processos completos.
        </p>
        <p className="text-sm text-muted-foreground">
          Explore <Link to="/bairros" className="underline underline-offset-4 hover:text-ink">bairros</Link>,{" "}
          <Link to="/condominios" className="underline underline-offset-4 hover:text-ink">condomínios</Link> ou{" "}
          <Link to="/imoveis" className="underline underline-offset-4 hover:text-ink">imóveis</Link>.
        </p>
      </div>
    </SectionPage>
  );
}
