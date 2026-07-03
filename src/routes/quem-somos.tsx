import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";

const URL = "https://alphaville-vantage.lovable.app/quem-somos";
const TITLE = "Quem Somos — S.A Imóveis Alphaville";
const DESC =
  "Consultoria imobiliária especializada em Alphaville, Tamboré, Barueri e Santana de Parnaíba. Conheça a Padilha Assessoria em Vendas, propósito, valores e diferenciais.";

export const Route = createFileRoute("/quem-somos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: TITLE,
          url: URL,
          description: DESC,
          about: {
            "@type": "RealEstateAgent",
            name: "S.A Imóveis Alphaville",
            legalName: "Padilha Assessoria em Vendas Ltda",
            taxID: "13.349.385/0001-49",
            address: {
              "@type": "PostalAddress",
              streetAddress: "Av. Marcos Penteado de Ulhôa Rodrigues, 4053 - Loja 4",
              addressLocality: "Santana de Parnaíba",
              addressRegion: "SP",
              postalCode: "06543-001",
              addressCountry: "BR",
            },
            areaServed: ["Alphaville", "Tamboré", "Barueri", "Santana de Parnaíba"],
          },
        }),
      },
    ],
  }),
  component: QuemSomos,
});

function QuemSomos() {
  return (
    <SectionPage
      eyebrow="Institucional"
      title="Quem somos"
      lead="Somos uma consultoria imobiliária dedicada exclusivamente à região de Alphaville, Tamboré, Barueri e Santana de Parnaíba. Nossa atuação combina leitura de mercado, atendimento consultivo e domínio profundo dos condomínios e bairros que formam este território."
      breadcrumbs={[{ label: "Quem somos" }]}
    >
      <div className="grid gap-16 md:grid-cols-3">
        <article className="md:col-span-2 space-y-10">
          <div>
            <h2 className="font-serif text-3xl mb-4">Uma empresa de raízes regionais</h2>
            <p className="text-ink/85 leading-relaxed">
              A S.A Imóveis Alphaville é operada pela Padilha Assessoria em Vendas Ltda, com sede em
              Tamboré, Santana de Parnaíba. Acompanhamos há mais de quinze anos a evolução urbana,
              imobiliária e econômica de uma das regiões mais desejadas do Brasil, atuando com
              locação, venda, permuta, administração e reforma.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-3xl mb-4">Propósito</h2>
            <p className="text-ink/85 leading-relaxed">
              Conectar pessoas ao imóvel certo, no bairro certo, no momento certo — com
              transparência, escuta e conhecimento técnico da região.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-3xl mb-4">Missão</h2>
            <p className="text-ink/85 leading-relaxed">
              Oferecer consultoria imobiliária de alto padrão, sustentada por informação confiável
              sobre condomínios, bairros, tendências de mercado e oportunidades reais.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-3xl mb-4">Visão</h2>
            <p className="text-ink/85 leading-relaxed">
              Ser reconhecida como a referência editorial e consultiva do mercado imobiliário de
              Alphaville e região, unindo curadoria, tecnologia e proximidade humana.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-3xl mb-4">Valores</h2>
            <ul className="space-y-3 text-ink/85 leading-relaxed list-disc list-inside">
              <li><strong>Ética:</strong> honestidade em cada negociação e informação.</li>
              <li><strong>Transparência:</strong> processos claros, contratos limpos, dados verificáveis.</li>
              <li><strong>Compromisso:</strong> presença antes, durante e depois do fechamento.</li>
              <li><strong>Excelência:</strong> curadoria criteriosa de imóveis e conteúdo.</li>
              <li><strong>Territorialidade:</strong> conhecimento vivo dos condomínios e bairros.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-serif text-3xl mb-4">Diferenciais</h2>
            <ul className="space-y-3 text-ink/85 leading-relaxed list-disc list-inside">
              <li>Foco exclusivo em Alphaville, Tamboré, Barueri e Santana de Parnaíba.</li>
              <li>Portal editorial próprio com guias de bairros e condomínios.</li>
              <li>Equipe consultiva com histórico regional consolidado.</li>
              <li>Atuação integrada: aluga, vende, permuta, administra e reforma.</li>
              <li>Sigilo, agilidade e acompanhamento personalizado.</li>
            </ul>
          </div>
        </article>

        <aside className="space-y-6 md:border-l md:border-ink/10 md:pl-10">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">
              Continue explorando
            </p>
            <ul className="space-y-3 text-sm">
              <li><Link to="/historia" className="hover:text-ink underline underline-offset-4">Nossa história</Link></li>
              <li><Link to="/como-trabalhamos" className="hover:text-ink underline underline-offset-4">Como trabalhamos</Link></li>
              <li><Link to="/servicos" className="hover:text-ink underline underline-offset-4">Serviços</Link></li>
              <li><Link to="/areas-de-atuacao" className="hover:text-ink underline underline-offset-4">Áreas de atuação</Link></li>
              <li><Link to="/contato" className="hover:text-ink underline underline-offset-4">Fale conosco</Link></li>
            </ul>
          </div>
        </aside>
      </div>
    </SectionPage>
  );
}
