import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage } from "@/components/section-page";

const URL = "https://alphaville-vantage.lovable.app/mapa-do-site";
const TITLE = "Mapa do Site — S.A Imóveis Alphaville";
const DESC =
  "Índice completo das páginas do portal S.A Imóveis Alphaville: institucional, serviços, editorial, guias de bairros, condomínios e páginas legais.";

const SECTIONS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Institucional",
    links: [
      { to: "/", label: "Início" },
      { to: "/quem-somos", label: "Quem somos" },
      { to: "/historia", label: "Nossa história" },
      { to: "/como-trabalhamos", label: "Como trabalhamos" },
      { to: "/servicos", label: "Serviços" },
      { to: "/areas-de-atuacao", label: "Áreas de atuação" },
      { to: "/transparencia", label: "Transparência" },
      { to: "/politica-de-atendimento", label: "Política de Atendimento" },
      { to: "/contato", label: "Contato" },
      { to: "/perguntas-frequentes", label: "Perguntas frequentes" },
    ],
  },
  {
    title: "Imóveis e regiões",
    links: [
      { to: "/imoveis", label: "Imóveis" },
      { to: "/bairros", label: "Bairros" },
      { to: "/condominios", label: "Condomínios" },
      { to: "/alphaville", label: "Alphaville" },
      { to: "/guia-alphaville", label: "Guia Alphaville" },
      { to: "/guia-tambore", label: "Guia Tamboré" },
      { to: "/guia-barueri", label: "Guia Barueri" },
      { to: "/guia-santana-de-parnaiba", label: "Guia Santana de Parnaíba" },
      { to: "/ruas", label: "Guia de ruas e avenidas" },
    ],
  },
  {
    title: "Editorial",
    links: [
      { to: "/blog", label: "Blog" },
      { to: "/mercado-imobiliario", label: "Mercado imobiliário" },
      { to: "/meio-ambiente", label: "Meio ambiente" },
      { to: "/investimentos", label: "Investimentos" },
      { to: "/empresas", label: "Empresas" },
      { to: "/escolas", label: "Escolas" },
      { to: "/restaurantes", label: "Restaurantes" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/politica-de-privacidade", label: "Política de Privacidade" },
      { to: "/politica-de-cookies", label: "Política de Cookies" },
      { to: "/lgpd", label: "LGPD" },
      { to: "/termos-de-uso", label: "Termos de Uso" },
      { to: "/aviso-legal", label: "Aviso Legal" },
    ],
  },
];

export const Route = createFileRoute("/mapa-do-site")({
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
  component: Mapa,
});

function Mapa() {
  return (
    <SectionPage
      eyebrow="Navegação"
      title="Mapa do site"
      lead="Um índice organizado com todas as áreas do portal. Útil para navegação humana e para descoberta por mecanismos de busca."
      breadcrumbs={[{ label: "Mapa do site" }]}
    >
      <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 max-w-6xl">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="font-serif text-xl mb-4">{s.title}</h2>
            <ul className="space-y-2 text-sm">
              {s.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-ink/85 hover:text-ink underline underline-offset-4">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionPage>
  );
}
