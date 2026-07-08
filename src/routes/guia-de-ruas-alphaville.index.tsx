import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { SectionPage } from "@/components/section-page";
import { listPublishedStreetGuides, type StreetGuideListItem } from "@/lib/street-guides.functions";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const HUB_SECTIONS: { key: string; title: string; description: string }[] = [
  { key: "alamedas-comerciais", title: "Principais alamedas comerciais de Alphaville", description: "Vias com forte concentração de escritórios, serviços e conveniência ao redor do Centro Comercial." },
  { key: "avenidas-de-acesso", title: "Avenidas de acesso e ligação", description: "Eixos que conectam Alphaville a Barueri, Santana de Parnaíba, Tamboré e à Castelo Branco." },
  { key: "residenciais", title: "Ruas próximas a condomínios residenciais", description: "Regiões de perfil residencial com casas em condomínio e proximidade a escolas e clubes." },
  { key: "centro-comercial", title: "Regiões próximas ao Centro Comercial Alphaville", description: "Salas comerciais, apartamentos e serviços na área mais movimentada do bairro." },
  { key: "tambore", title: "Regiões próximas ao Tamboré", description: "Residenciais de alto padrão, clubes e vias que estruturam Tamboré e seu entorno." },
  { key: "santana-de-parnaiba", title: "Regiões próximas a Santana de Parnaíba", description: "Novos condomínios, centro histórico e vias de ligação com Alphaville." },
  { key: "barueri", title: "Regiões próximas a Barueri", description: "Polo corporativo, mobilidade e áreas mistas do lado de Barueri." },
  { key: "aldeia-da-serra", title: "Regiões próximas à Aldeia da Serra", description: "Área verde de alto padrão, com condomínios de baixa densidade e natureza." },
];

const QO = queryOptions({
  queryKey: ["street-guides", "published"],
  queryFn: () => listPublishedStreetGuides(),
});

export const Route = createFileRoute("/guia-de-ruas-alphaville/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(QO),
  head: () => ({
    meta: [
      { title: "Guia de Ruas de Alphaville: alamedas, avenidas e imóveis próximos" },
      { name: "description", content: "Conheça as principais ruas, avenidas e alamedas de Alphaville, Tamboré, Barueri e Santana de Parnaíba. Veja localização, perfil da região e imóveis próximos." },
      { property: "og:title", content: "Guia de Ruas de Alphaville" },
      { property: "og:description", content: "Ruas, avenidas e alamedas de Alphaville, Tamboré, Barueri e Santana de Parnaíba com imóveis cadastrados por região." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/guia-de-ruas-alphaville` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/guia-de-ruas-alphaville` }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Guia de Ruas de Alphaville", item: `${SITE_URL}/guia-de-ruas-alphaville` },
        ],
      }),
    }],
  }),
  errorComponent: ({ error }) => (
    <SiteLayout><section className="px-6 py-24 max-w-3xl mx-auto"><p className="text-sm">{error.message}</p></section></SiteLayout>
  ),
  notFoundComponent: () => null,
  component: StreetGuidesHub,
});

function StreetGuidesHub() {
  const { data: guides } = useSuspenseQuery(QO);
  const bySection = new Map<string, StreetGuideListItem[]>();
  for (const g of guides) {
    const key = g.hub_section || "outras";
    const list = bySection.get(key) ?? [];
    list.push(g);
    bySection.set(key, list);
  }

  return (
    <SectionPage
      eyebrow="Guia de ruas"
      title="Guia de ruas, avenidas e alamedas de Alphaville"
      lead="Alphaville tem áreas residenciais, comerciais e corporativas com perfis muito distintos. Conhecer as principais ruas, avenidas e alamedas ajuda quem pretende morar, alugar, comprar ou investir na região a tomar decisões melhor informadas."
      breadcrumbs={[{ label: "Guia de Ruas" }]}
    >
      {guides.length === 0 ? (
        <div className="border border-ink/10 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Estamos publicando os primeiros guias de ruas. Volte em breve — ou entre em contato com a S.A Imóveis para orientações imediatas sobre a região.
          </p>
        </div>
      ) : (
        <div className="space-y-20">
          {HUB_SECTIONS.map((sec) => {
            const items = bySection.get(sec.key) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={sec.key}>
                <div className="mb-8 max-w-3xl">
                  <h2 className="font-serif text-3xl md:text-4xl text-ink text-balance">{sec.title}</h2>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{sec.description}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
                  {items.map((g) => <StreetCard key={g.id} guide={g} />)}
                </div>
              </section>
            );
          })}
          {(bySection.get("outras") ?? []).length > 0 && (
            <section>
              <h2 className="font-serif text-3xl md:text-4xl text-ink mb-8">Outras ruas e regiões</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
                {(bySection.get("outras") ?? []).map((g) => <StreetCard key={g.id} guide={g} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </SectionPage>
  );
}

function StreetCard({ guide }: { guide: StreetGuideListItem }) {
  const viaLabel = guide.via_type === "alameda" ? "Alameda"
    : guide.via_type === "avenida" ? "Avenida"
    : guide.via_type === "regiao" ? "Região"
    : guide.via_type === "calcada" ? "Calçada"
    : guide.via_type === "centro" ? "Centro"
    : "Rua";
  const local = [guide.neighborhood, guide.city].filter(Boolean).join(" · ");
  return (
    <Link
      to="/guia-de-ruas-alphaville/$slug"
      params={{ slug: guide.slug }}
      className="group block border-t border-ink/10 pt-6"
    >
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
        {viaLabel}{local ? ` · ${local}` : ""}
      </p>
      <h3 className="font-serif text-2xl font-medium leading-snug mb-3 text-balance group-hover:underline">
        {guide.name}
      </h3>
      {guide.short_description && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {guide.short_description}
        </p>
      )}
    </Link>
  );
}
