import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { SectionPage } from "@/components/section-page";
import { PremiumCard } from "@/components/premium-card";
import { listPublishedStreets, type StreetListItem } from "@/lib/streets.functions";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const QO = queryOptions({
  queryKey: ["ruas", "published"],
  queryFn: () => listPublishedStreets(),
});

export const Route = createFileRoute("/ruas/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(QO),
  head: () => ({
    meta: [
      { title: "Ruas e Avenidas de Alphaville, Tamboré, Barueri e Santana de Parnaíba" },
      { name: "description", content: "Encontre imóveis por rua e avenida em Alphaville, Tamboré, Barueri e Santana de Parnaíba. Guia completo com informações da via, entorno e imóveis disponíveis." },
      { property: "og:title", content: "Guia de Ruas e Avenidas de Alphaville" },
      { property: "og:description", content: "Ruas e avenidas da região com imóveis vinculados automaticamente ao endereço." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/ruas` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/ruas` }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Ruas e Avenidas", item: `${SITE_URL}/ruas` },
        ],
      }),
    }],
  }),
  errorComponent: ({ error }) => (
    <SiteLayout><section className="px-6 py-24 max-w-3xl mx-auto"><p className="text-sm">{error.message}</p></section></SiteLayout>
  ),
  notFoundComponent: () => null,
  component: RuasHub,
});

function typeLabel(t: string | null | undefined) {
  switch (t) {
    case "avenida": return "Avenida";
    case "alameda": return "Alameda";
    case "rodovia": return "Rodovia";
    case "estrada": return "Estrada";
    case "praca": return "Praça";
    case "travessa": return "Travessa";
    case "via": return "Via";
    default: return "Rua";
  }
}

function RuasHub() {
  const { data: streets } = useSuspenseQuery(QO);
  const byCity = new Map<string, StreetListItem[]>();
  for (const s of streets) {
    const key = s.city || "Outras localidades";
    const arr = byCity.get(key) ?? [];
    arr.push(s);
    byCity.set(key, arr);
  }
  const featured = streets.filter((s) => s.featured);

  return (
    <SectionPage
      eyebrow="Guia de ruas"
      title="Ruas e avenidas de Alphaville e região"
      lead="Encontre imóveis por endereço. Cada rua reúne informações sobre a via, o entorno e os imóveis cadastrados no local — vinculados automaticamente pelo endereço."
      breadcrumbs={[{ label: "Ruas e Avenidas" }]}
    >
      {streets.length === 0 ? (
        <div className="border border-ink/10 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Estamos publicando as primeiras ruas. Volte em breve.
          </p>
        </div>
      ) : (
        <div className="space-y-20">
          {featured.length > 0 && (
            <section>
              <div className="mb-8 max-w-3xl">
                <h2 className="font-serif text-3xl md:text-4xl text-ink text-balance">Ruas em destaque</h2>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  Endereços mais procurados por quem busca imóveis na região.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
                {featured.map((s) => <StreetCard key={s.id} street={s} />)}
              </div>
            </section>
          )}
          {[...byCity.entries()].map(([city, items]) => (
            <section key={city}>
              <div className="mb-8 max-w-3xl">
                <h2 className="font-serif text-3xl md:text-4xl text-ink text-balance">{city}</h2>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {items.length} {items.length === 1 ? "via cadastrada" : "vias cadastradas"} nesta localidade.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
                {items.map((s) => <StreetCard key={s.id} street={s} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </SectionPage>
  );
}

function StreetCard({ street }: { street: StreetListItem }) {
  const local = [street.neighborhood, street.city].filter(Boolean).join(" · ");
  return (
    <PremiumCard
      to={"/ruas/$slug" as never}
      params={{ slug: street.slug } as never}
      image={street.hero_image || null}
      imageAlt={street.name}
      eyebrow={`${typeLabel(street.street_type)}${local ? ` · ${local}` : ""}`}
      title={street.name}
      description={street.short_description ?? undefined}
      cta="Ver rua"
      aspectRatio="tall"
      fallback={{ type: "region", region: street.neighborhood ?? street.city, seed: street.slug }}
    />
  );
}
