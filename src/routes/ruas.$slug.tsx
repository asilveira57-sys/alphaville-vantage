import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { SectionPage } from "@/components/section-page";
import { PremiumCard } from "@/components/premium-card";
import {
  getStreetBySlug,
  findPropertiesOnStreet,
  listNearbyStreets,
} from "@/lib/streets.functions";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const streetQO = (slug: string) => queryOptions({
  queryKey: ["ruas", "detail", slug],
  queryFn: () => getStreetBySlug({ data: { slug } }),
});
const propsQO = (slug: string) => queryOptions({
  queryKey: ["ruas", "properties", slug],
  queryFn: () => findPropertiesOnStreet({ data: { slug, limit: 12 } }),
});
const nearbyQO = (slug: string) => queryOptions({
  queryKey: ["ruas", "nearby", slug],
  queryFn: () => listNearbyStreets({ data: { slug, limit: 6 } }),
});

export const Route = createFileRoute("/ruas/$slug")({
  loader: async ({ params, context }) => {
    const street = await context.queryClient.ensureQueryData(streetQO(params.slug));
    if (!street) throw notFound();
    void context.queryClient.prefetchQuery(propsQO(params.slug));
    void context.queryClient.prefetchQuery(nearbyQO(params.slug));
    return { street };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Rua não encontrada" }, { name: "robots", content: "noindex" }] };
    }
    const s: any = loaderData.street;
    const title = s.seo_title || `${s.name} — ${s.neighborhood ?? s.city ?? "Alphaville"}`;
    const desc = s.seo_description || s.short_description || `Imóveis, informações e entorno da ${s.name}${s.neighborhood ? `, em ${s.neighborhood}` : ""}.`;
    const url = `${SITE_URL}/ruas/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(s.hero_image ? [{ property: "og:image", content: s.hero_image }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: s.canonical_url || url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Place",
          name: s.name,
          address: {
            "@type": "PostalAddress",
            streetAddress: s.name,
            addressLocality: s.city,
            addressRegion: s.state ?? "SP",
            addressCountry: "BR",
          },
          ...(s.latitude && s.longitude ? {
            geo: { "@type": "GeoCoordinates", latitude: s.latitude, longitude: s.longitude },
          } : {}),
        }),
      }],
    };
  },
  errorComponent: ({ error }) => (
    <SiteLayout><section className="px-6 py-24 max-w-3xl mx-auto"><p className="text-sm">{error.message}</p></section></SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Rua não encontrada</p>
        <h1 className="mt-4 font-serif text-3xl">Essa rua ainda não foi cadastrada</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Volte para o <Link to="/ruas" className="underline">guia de ruas</Link> ou fale com nossa equipe.
        </p>
      </section>
    </SiteLayout>
  ),
  component: StreetDetail,
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

function fmtPrice(v: number | null | undefined) {
  if (!v) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function StreetDetail() {
  const { slug } = Route.useParams();
  const { data: street } = useSuspenseQuery(streetQO(slug)) as any;
  const { data: propsData } = useSuspenseQuery(propsQO(slug));
  const { data: nearby } = useSuspenseQuery(nearbyQO(slug));

  const local = [street.neighborhood, street.city].filter(Boolean).join(" · ");
  const tierMessage =
    propsData.tier === "linked" ? "Imóveis cadastrados nesta rua"
    : propsData.tier === "neighborhood" ? `Imóveis próximos, no mesmo bairro (${street.neighborhood})`
    : propsData.tier === "city" ? `Imóveis em ${street.city}`
    : null;

  return (
    <SectionPage
      eyebrow={`${typeLabel(street.street_type)}${local ? ` · ${local}` : ""}`}
      title={street.h1 || street.name}
      lead={street.short_description ?? `Informações sobre a ${street.name}, entorno e imóveis disponíveis na região.`}
      breadcrumbs={[
        { label: "Ruas e Avenidas", to: "/ruas" },
        { label: street.name },
      ]}
    >
      <div className="space-y-20">
        {street.description && (
          <section className="max-w-3xl">
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-4">Sobre esta via</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
              {street.description}
            </div>
          </section>
        )}

        {(street.access_information || street.traffic_information || street.parking_information || street.public_transport_information) && (
          <section>
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-8">Mobilidade e acesso</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {street.access_information && <InfoBlock title="Acesso" body={street.access_information} />}
              {street.traffic_information && <InfoBlock title="Trânsito" body={street.traffic_information} />}
              {street.public_transport_information && <InfoBlock title="Transporte público" body={street.public_transport_information} />}
              {street.parking_information && <InfoBlock title="Estacionamento" body={street.parking_information} />}
            </div>
          </section>
        )}

        <section>
          <div className="mb-8 max-w-3xl">
            <h2 className="font-serif text-3xl md:text-4xl text-ink">Imóveis na região</h2>
            {tierMessage && <p className="mt-3 text-sm text-muted-foreground">{tierMessage}</p>}
          </div>
          {propsData.items.length === 0 ? (
            <div className="border border-ink/10 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum imóvel disponível no momento. <Link to="/contato" className="underline">Fale com nossa equipe</Link> para receber oportunidades.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
              {propsData.items.map((p: any) => {
                const price = fmtPrice(p.price_sale) || fmtPrice(p.price_rent);
                const desc = [
                  p.bedrooms ? `${p.bedrooms} dorm.` : null,
                  p.suites ? `${p.suites} suítes` : null,
                  p.area ? `${p.area}m²` : null,
                  p.parking ? `${p.parking} vagas` : null,
                ].filter(Boolean).join(" · ");
                return (
                  <PremiumCard
                    key={p.id}
                    to={"/imoveis/$slug" as never}
                    params={{ slug: p.slug } as never}
                    image={p.images?.[0] ?? null}
                    imageAlt={p.title}
                    eyebrow={[p.property_type, p.neighborhood].filter(Boolean).join(" · ")}
                    title={p.title}
                    description={[price, desc].filter(Boolean).join(" — ")}
                    cta="Ver imóvel"
                    aspectRatio="tall"
                    fallback={{ type: "region", region: p.neighborhood ?? p.city, seed: p.slug }}
                  />
                );
              })}
            </div>
          )}
        </section>

        {Array.isArray(street.faq) && street.faq.length > 0 && (
          <section className="max-w-3xl">
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-8">Perguntas frequentes</h2>
            <div className="space-y-6">
              {street.faq.map((f: any, i: number) => (
                <div key={i} className="border-t border-ink/10 pt-6">
                  <h3 className="text-base font-medium text-ink">{f.question}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {nearby.length > 0 && (
          <section>
            <div className="mb-8 max-w-3xl">
              <h2 className="font-serif text-3xl md:text-4xl text-ink">Outras vias próximas</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Explore mais ruas {street.neighborhood ? `em ${street.neighborhood}` : `em ${street.city}`}.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
              {nearby.map((n: any) => {
                const nlocal = [n.neighborhood, n.city].filter(Boolean).join(" · ");
                return (
                  <PremiumCard
                    key={n.id}
                    to={"/ruas/$slug" as never}
                    params={{ slug: n.slug } as never}
                    image={n.hero_image || null}
                    imageAlt={n.name}
                    eyebrow={`${typeLabel(n.street_type)}${nlocal ? ` · ${nlocal}` : ""}`}
                    title={n.name}
                    description={n.short_description ?? undefined}
                    cta="Ver rua"
                    aspectRatio="tall"
                    fallback={{ type: "region", region: n.neighborhood ?? n.city, seed: n.slug }}
                  />
                );
              })}
            </div>
          </section>
        )}
      </div>
    </SectionPage>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-ink/10 pt-6">
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm text-ink leading-relaxed whitespace-pre-line">{body}</p>
    </div>
  );
}
