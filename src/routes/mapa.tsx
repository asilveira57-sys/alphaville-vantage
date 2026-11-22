import { SITE_URL } from "@/lib/site";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteLayout } from "@/components/site-layout";

const URL = `${SITE_URL}/mapa`;
const TITLE = "Mapa de condomínios de Alphaville e Tamboré | S.A Imóveis";
const DESC =
  "Veja no mapa os condomínios de Alphaville, Tamboré, Barueri e Santana de Parnaíba com imóveis à venda e para alugar hoje. Toque no condomínio e veja os imóveis.";

const REGIOES = [
  { to: "/guia/alphaville-barueri", label: "Alphaville (Barueri)" },
  { to: "/guia/alphaville-santana-de-parnaiba", label: "Alphaville (Santana de Parnaíba)" },
  { to: "/guia/alphaville-empresarial-barueri", label: "Alphaville Empresarial e Green Valley" },
  { to: "/guia/tambore-santana-de-parnaiba", label: "Tamboré (Santana de Parnaíba)" },
  { to: "/guia/tambore-barueri", label: "Tamboré (Barueri)" },
  { to: "/guia/guia-completo-do-18-do-forte-alphaville-como-e-morar-no-bairro-em-barueri", label: "18 do Forte" },
  { to: "/guia/aldeia-da-serra-santana-de-parnaiba", label: "Aldeia da Serra" },
];

/** Mapa de condomínios dentro do portal. O mapa em si é o arquivo estático public/mapa-prototipo.html (?embed=1), lido ao vivo do banco. */
export const Route = createFileRoute("/mapa")({
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
          "@type": "WebPage",
          name: TITLE,
          description: DESC,
          url: URL,
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Mapa de condomínios", item: URL },
            ],
          },
        }),
      },
    ],
  }),
  component: MapaPage,
});

function MapaPage() {
  useEffect(() => {
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    w.gtag?.("event", "map_open", { page: "/mapa" });
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; code?: string; condo?: string } | null;
      if (d?.type === "map_property_click") w.gtag?.("event", "map_property_click", { code: d.code, condo: d.condo });
      if (d?.type === "map_condo_open") w.gtag?.("event", "map_condo_open", { condo: d.condo });
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  return (
    <SiteLayout>
      <section className="bg-[#0D0D0D]">
        <h1 className="sr-only">Mapa de condomínios de Alphaville e Tamboré</h1>
        <iframe
          title="Mapa de condomínios de Alphaville e Tamboré"
          src="/mapa-prototipo.html?embed=1"
          className="block w-full border-0"
          style={{ height: "calc(100svh - 110px)", minHeight: 520 }}
          loading="eager"
        />
      </section>

      <section className="px-6 py-16 border-t border-ink/8">
        <div className="max-w-4xl mx-auto space-y-10">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-4">Como usar o mapa</h2>
            <p className="text-ink/80 leading-relaxed">
              Cada bolha é um condomínio com imóveis à venda ou para alugar na carteira da S.A Imóveis. O número na bolha é a
              quantidade de imóveis disponíveis hoje. Toque na bolha para ver a lista, com foto, preço e link para cada anúncio.
              Use os botões no topo para mostrar só venda ou só locação, ou busque o condomínio pelo nome.
            </p>
            <p className="mt-4 text-ink/80 leading-relaxed">
              Os contornos tracejados são complexos com vários condomínios dentro, como o Green Valley, o Gramercy Park e o
              Alphagran. Por segurança, o mapa mostra só o condomínio, nunca o número da casa ou do apartamento.
            </p>
          </div>
          <div>
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-4">Guias das regiões</h2>
            <ul className="flex flex-wrap gap-3">
              {REGIOES.map((r) => (
                <li key={r.to}>
                  <Link to={r.to as never} className="inline-block border border-ink/15 px-4 py-2 text-sm hover:border-ink">{r.label}</Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-ink/70">
              Prefere buscar por filtros? Use a <Link to="/imoveis" className="underline">busca de imóveis</Link> ou veja a lista de{" "}
              <Link to="/condominios" className="underline">condomínios</Link> e o <Link to="/guia-de-ruas" className="underline">guia de ruas</Link>.
            </p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
