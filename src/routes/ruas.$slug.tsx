import { SITE_URL } from "@/lib/site";
import { absoluteImageUrl, firstRealImage, largeVariant } from "@/lib/image-fallbacks";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { SectionPage } from "@/components/section-page";
import { PremiumCard } from "@/components/premium-card";
import { CleanPropertyCard } from "@/components/premium-cards/clean-property-card";
import { EditorialContent } from "@/components/editorial-content";
import { ResolvedCta } from "@/components/resolved-cta";
import { VideoCard, YouTubeVideo } from "@/components/youtube-video";
import { videoObjectScript } from "@/lib/youtube";
import { GuideDownloadLead } from "@/components/guide-download-lead";
import { areaShort, cepFaq, cepLabel, cleanBairro, parseCeps } from "@/lib/street-ceps";
import { brl, computedStreetFaq, groupNearby, kmLabel, type StreetOverview } from "@/lib/street-overview";
import {
  getStreetBySlug,
  findPropertiesOnStreet,
  listNearbyStreets,
  getStreetOverview,
} from "@/lib/streets.functions";


const streetQO = (slug: string) => queryOptions({
  queryKey: ["ruas", "detail", slug],
  queryFn: () => getStreetBySlug({ data: { slug } }),
});
const propsQO = (slug: string) => queryOptions({
  queryKey: ["ruas", "properties", slug],
  queryFn: () => findPropertiesOnStreet({ data: { slug, limit: 12 } }),
});
const overviewQO = (slug: string) => queryOptions({
  queryKey: ["ruas", "overview", slug],
  queryFn: () => getStreetOverview({ data: { slug } }),
});
const nearbyQO = (slug: string) => queryOptions({
  queryKey: ["ruas", "nearby", slug],
  queryFn: () => listNearbyStreets({ data: { slug, limit: 6 } }),
});

export const Route = createFileRoute("/ruas/$slug")({
  loader: async ({ params, context }) => {
    const street = await context.queryClient.ensureQueryData(streetQO(params.slug));
    if (!street) throw notFound();
    const overview = await context.queryClient.ensureQueryData(overviewQO(params.slug));
    void context.queryClient.prefetchQuery(propsQO(params.slug));
    void context.queryClient.prefetchQuery(nearbyQO(params.slug));
    return { street, overview };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Rua não encontrada" }, { name: "robots", content: "noindex" }] };
    }
    const s: any = loaderData.street;
    const ceps = parseCeps(s.ceps);
    const cl = cepLabel(ceps);
    const faqAll = [
      ...cepFaq(s.name, ceps),
      ...(Array.isArray(s.faq) ? s.faq : []),
      ...computedStreetFaq(s.name, (loaderData.overview ?? null) as StreetOverview | null, s.nearby),
    ];
    const title = cl
      ? `${s.name}, ${areaShort(s.neighborhood, s.city)}: CEP ${cl}, mapa e imóveis`
      : s.seo_title || `${s.name} — ${s.neighborhood ?? s.city ?? "Alphaville"}`;
    const baseDesc = s.seo_description || s.short_description || `Imóveis, informações e entorno da ${s.name}${s.neighborhood ? `, em ${s.neighborhood}` : ""}.`;
    const desc = cl ? `CEP da ${s.name}: ${cl}. ${baseDesc}` : baseDesc;
    const url = `${SITE_URL}/ruas/${params.slug}`;
    const social = absoluteImageUrl(firstRealImage(s.social_image, largeVariant(s.card_image)), SITE_URL);
    const robots = `${s.robots_index === false ? "noindex" : "index"},${s.robots_follow === false ? "nofollow" : "follow"}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        ...(s.seo_keywords ? [{ name: "keywords", content: s.seo_keywords }] : []),
        { name: "robots", content: robots },
        { property: "og:title", content: s.og_title || title },
        { property: "og:description", content: s.og_description || desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(social ? [{ property: "og:image", content: social }] : []),
        ...(social ? [{ name: "twitter:image", content: social }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: s.canonical_url || url }],
      scripts: [
        ...videoObjectScript(s.video, { title: s.name, description: desc, pageUrl: url }),
        {
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
              ...(ceps.find((c) => c.tipo === "geral") ? { postalCode: ceps.find((c) => c.tipo === "geral")!.cep } : {}),
              addressCountry: "BR",
            },
            ...(s.latitude && s.longitude ? {
              geo: { "@type": "GeoCoordinates", latitude: s.latitude, longitude: s.longitude },
            } : {}),
            hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name}, ${s.city ?? ""} - SP`)}`,
            url,
          }),
        },
        ...(faqAll.length > 0 ? [{
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqAll.map((f: any) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }),
        }] : []),
      ],
    };

  },
  errorComponent: ({ error }) => (
    <SiteLayout><section className="px-6 py-24 max-w-3xl mx-auto"><p className="text-sm">{(error as Error).message}</p></section></SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Rua não encontrada</p>
        <h1 className="mt-4 font-serif text-3xl">Essa rua ainda não foi cadastrada</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Volte para o <Link to="/guia-de-ruas" className="underline">guia de ruas</Link> ou fale com nossa equipe.
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
    case "calcada": return "Calçada";
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
  const { data: overview } = useSuspenseQuery(overviewQO(slug)) as { data: StreetOverview | null };
  const nearGroups = groupNearby(street.nearby);
  const ceps = parseCeps(street.ceps);
  const cepsGerais = ceps.filter((c) => c.tipo === "geral");
  const cepsNumero = ceps.filter((c) => c.tipo === "numero");
  const faqAll = [...cepFaq(street.name, ceps), ...(Array.isArray(street.faq) ? street.faq : []), ...computedStreetFaq(street.name, overview, street.nearby)];
  const mapQuery = `${street.name}, ${street.city ?? ""} - SP`;

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
        { label: "Ruas e Avenidas", to: "/guia-de-ruas" },
        { label: street.name },
      ]}
    >
      <div className="space-y-20">
        {cepsGerais.length > 0 && (
          <section id="cep" className="max-w-4xl border border-ink/15 p-6 md:p-8">
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-4">CEP da {street.name}</h2>
            <ul className="space-y-3">
              {cepsGerais.map((c) => (
                <li key={c.cep} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-serif text-3xl md:text-4xl text-ink tabular-nums">{c.cep}</span>
                  <span className="text-sm text-muted-foreground">
                    {[c.logradouro !== street.name ? c.logradouro : null, c.complemento, cleanBairro(c.bairro), c.cidade].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
            {cepsNumero.length > 0 && (
              <details className="mt-6 text-sm">
                <summary className="cursor-pointer text-ink">Prédios e empresas com CEP próprio ({cepsNumero.length})</summary>
                <table className="mt-3 w-full max-w-md">
                  <thead><tr className="text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground"><th className="py-1">Número</th><th className="py-1">CEP</th></tr></thead>
                  <tbody>
                    {[...cepsNumero].sort((a, b) => parseInt(a.complemento ?? "0") - parseInt(b.complemento ?? "0")).map((c) => (
                      <tr key={c.cep} className="border-t border-ink/10"><td className="py-1.5">nº {c.complemento}</td><td className="py-1.5 tabular-nums">{c.cep}</td></tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
            <p className="mt-6 text-xs text-muted-foreground">Fonte: base de CEPs dos Correios. Confira o número do imóvel antes de enviar uma correspondência.</p>
          </section>
        )}
        {street.card_image && (
          <figure className="max-w-4xl">
            <img width={800} height={600} decoding="async"
              src={largeVariant(street.card_image) ?? street.card_image}
              alt={street.hero_image_alt || `Imóvel da carteira S.A na ${street.name}${street.city ? `, ${street.city}` : ""}`}
              loading="lazy"
              className="w-full object-cover aspect-[16/9] border border-ink/10"
            />
          </figure>
        )}

        {overview && overview.total > 0 && (
          <section>
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-2">{street.name} em números hoje</h2>
            <p className="text-sm text-muted-foreground mb-8">Imóveis ativos na carteira da S.A Imóveis. Os números mudam conforme os imóveis entram e saem.</p>
            <div className="grid grid-cols-3 gap-px bg-ink/10 border border-ink/10 max-w-3xl">
              {[["Imóveis", overview.total], ["À venda", overview.venda], ["Para alugar", overview.aluguel]].map(([l, v]) => (
                <div key={l as string} className="bg-background p-5">
                  <p className="font-serif text-3xl md:text-4xl text-ink">{v as number}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{l as string}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 overflow-x-auto max-w-4xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink/15 text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Tipo</th>
                    <th className="py-3 pr-4 font-medium">Imóveis</th>
                    <th className="py-3 pr-4 font-medium">Venda a partir de</th>
                    <th className="py-3 pr-4 font-medium">Venda (mediana)</th>
                    <th className="py-3 font-medium">Aluguel a partir de</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.tipos.map((t) => (
                    <tr key={t.grupo} className="border-b border-ink/10">
                      <td className="py-3 pr-4 text-ink">{t.grupo}</td>
                      <td className="py-3 pr-4">{t.n}</td>
                      <td className="py-3 pr-4">{brl(t.min_venda) ?? "—"}</td>
                      <td className="py-3 pr-4">{brl(t.med_venda) ?? "—"}</td>
                      <td className="py-3">{t.min_aluguel ? `${brl(t.min_aluguel)}/mês` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {street.video && (street.video.href
          ? <VideoCard video={street.video} />
          : <YouTubeVideo video={street.video} fallbackTitle={street.name} className="!px-0 !py-0" />)}

        {street.description && (
          <section className="max-w-3xl">
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-4">Sobre esta via</h2>
            {/^\s*</.test(street.description) ? (
              <EditorialContent html={street.description} />
            ) : (
              <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
                {street.description}
              </div>
            )}
          </section>
        )}

        {overview && overview.condominios.length > 0 && (
          <section className="max-w-4xl">
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-2">Condomínios e edifícios na {street.name}</h2>
            <p className="text-sm text-muted-foreground mb-6">Com imóveis ativos na nossa carteira hoje.</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
              {overview.condominios.map((c) => (
                <li key={c.nome} className="flex justify-between gap-4 border-b border-ink/10 py-3 text-sm">
                  {c.slug ? (
                    <Link to={"/condominios/$slug" as never} params={{ slug: c.slug } as never} className="text-ink underline-offset-4 hover:underline">{c.nome}</Link>
                  ) : (
                    <span className="text-ink">{c.nome}</span>
                  )}
                  <span className="text-muted-foreground shrink-0">{c.n} {c.n === 1 ? "imóvel" : "imóveis"}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="max-w-5xl">
          <h2 className="font-serif text-2xl md:text-3xl text-ink mb-6">Mapa da {street.name}</h2>
          <div className="aspect-[16/9] w-full border border-ink/10 bg-muted">
            <iframe
              title={`Mapa da ${street.name}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noopener noreferrer"
            className="mt-4 inline-block text-[11px] uppercase tracking-[0.2em] underline">Traçar rota →</a>
        </section>

        {nearGroups.length > 0 && (
          <section className="max-w-4xl">
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-2">O que tem perto da {street.name}</h2>
            <p className="text-sm text-muted-foreground mb-8">Distâncias de carro pelas ruas, sem trânsito, medidas a partir dos condomínios da região. Fonte: OpenStreetMap.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {nearGroups.map((g) => (
                <div key={g.cat}>
                  <h3 className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground mb-2">{g.cat}</h3>
                  <ul>
                    {g.items.map((i) => (
                      <li key={i.name} className="flex justify-between gap-4 border-b border-ink/10 py-2 text-sm">
                        <span className="text-ink">{i.name}</span>
                        <span className="text-muted-foreground shrink-0">{kmLabel(i)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {Array.isArray(street.gallery_images) && street.gallery_images.length > 0 && (
          <section>
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-8">Galeria</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(street.gallery_images as any[]).map((g: any, i: number) => {
                const url = typeof g === "string" ? g : g?.url;
                if (!url) return null;
                return (
                  <figure key={url + i}>
                    <img width={800} height={600} decoding="async" src={url} alt={(typeof g === "object" && g?.alt) || street.name} loading="lazy"
                      className="w-full object-cover aspect-[4/3] border border-ink/10" />
                    {typeof g === "object" && g?.caption && (
                      <figcaption className="mt-2 text-xs text-muted-foreground">{g.caption}</figcaption>
                    )}
                  </figure>
                );
              })}
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
                  <CleanPropertyCard
                    key={p.id}
                    slug={p.slug}
                    image={p.card_image_url ?? p.images?.[0] ?? null}
                    title={p.title}
                    propertyType={p.property_type}
                    neighborhood={p.neighborhood}
                    city={p.city}
                    internalCode={p.internal_code}
                    purpose={p.purpose}
                    priceSale={p.price_sale}
                    priceRent={p.price_rent}
                    bedrooms={p.bedrooms}
                    parking={p.parking}
                    area={p.area}
                  />
                );
              })}
            </div>
          )}
        </section>

        <GuideDownloadLead
          kind="rua"
          slug={street.slug}
          title={street.name}
          heading={`Baixe a ficha da ${street.name}`}
          text="PDF com os imóveis e preços de hoje, os condomínios da rua e o que tem perto. Gratuito: só pedimos seu contato."
          fileName={`ficha-${street.slug}-sa-imoveis.pdf`}
          buildPdf={async (firstName) => {
            const { buildStreetFichaPdf } = await import("@/lib/street-ficha-pdf");
            return buildStreetFichaPdf({
              name: street.name, slug: street.slug, local: [street.neighborhood, street.city].filter(Boolean).join(", "),
              firstName, overview, nearby: street.nearby, summary: street.short_description,
            });
          }}
        />

        {faqAll.length > 0 && (
          <section className="max-w-3xl">
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-8">Perguntas frequentes</h2>
            <div className="space-y-6">
              {faqAll.map((f: any, i: number) => (
                <div key={i} className="border-t border-ink/10 pt-6">
                  <h3 className="text-base font-medium text-ink">{f.question}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <ResolvedCta
          contentType="rua"
          vars={{ rua: (street as { name?: string }).name ?? "" }}
          ctaId={(street as any).cta_id}
          hidden={(street as any).cta_hidden}
        />


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
                    image={n.card_image}
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
