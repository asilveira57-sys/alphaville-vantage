import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { CleanPropertyCard } from "@/components/premium-cards/clean-property-card";
import {
  getStreetGuideBySlug,
  findPropertiesNearStreet,
} from "@/lib/street-guides.functions";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const viaLabelOf = (v: string) =>
  v === "alameda" ? "Alameda"
  : v === "avenida" ? "Avenida"
  : v === "regiao" ? "Região"
  : v === "calcada" ? "Calçada"
  : v === "centro" ? "Centro"
  : "Rua";

const guideQO = (slug: string) => queryOptions({
  queryKey: ["street-guide", slug],
  queryFn: () => getStreetGuideBySlug({ data: { slug } }),
});
const nearbyQO = (slug: string) => queryOptions({
  queryKey: ["street-guide-nearby", slug],
  queryFn: () => findPropertiesNearStreet({ data: { slug, limit: 9 } }),
});

export const Route = createFileRoute("/guia-de-ruas-alphaville/$slug")({
  loader: async ({ context, params }) => {
    const guide = await context.queryClient.ensureQueryData(guideQO(params.slug));
    if (!guide) throw notFound();
    context.queryClient.ensureQueryData(nearbyQO(params.slug)).catch(() => {});
    return guide;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Rua não encontrada" }, { name: "robots", content: "noindex" }] };
    }
    const g: any = loaderData;
    const url = `${SITE_URL}/guia-de-ruas-alphaville/${params.slug}`;
    const title = g.seo_title || `${g.name} em Alphaville: guia da região e imóveis próximos`;
    const desc = g.meta_description || `Conheça a região da ${g.name} em Alphaville. Perfil da localização, acessos, comércio, condomínios próximos e imóveis cadastrados.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(g.og_image ? [{ property: "og:image", content: g.og_image }] : []),
      ],
      links: [{ rel: "canonical", href: g.canonical_override || url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: title,
            description: desc,
            url,
            image: g.og_image || undefined,
            datePublished: g.published_at,
            dateModified: g.updated_at,
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Guia de Ruas de Alphaville", item: `${SITE_URL}/guia-de-ruas-alphaville` },
              { "@type": "ListItem", position: 3, name: g.name, item: url },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Place",
            name: g.name,
            address: {
              "@type": "PostalAddress",
              addressLocality: g.city || g.region || "Alphaville",
              addressRegion: "SP",
              addressCountry: "BR",
            },
            ...(g.latitude && g.longitude ? {
              geo: { "@type": "GeoCoordinates", latitude: g.latitude, longitude: g.longitude },
            } : {}),
          }),
        },
        ...(Array.isArray(g.faq) && g.faq.length > 0 ? [{
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: g.faq.map((f: { question: string; answer: string }) => ({
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
    <SiteLayout><section className="px-6 py-24 max-w-3xl mx-auto"><p className="text-sm text-muted-foreground">{error.message}</p></section></SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Guia de ruas</p>
        <h1 className="font-serif text-4xl text-ink mb-4">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground">
          Essa rua ainda não tem guia publicado no portal. Volte ao <Link to="/guia-de-ruas-alphaville" className="underline">Guia de Ruas</Link>.
        </p>
      </section>
    </SiteLayout>
  ),
  component: StreetGuidePage,
});

function StreetGuidePage() {
  const { slug } = Route.useParams();
  const { data: g } = useSuspenseQuery(guideQO(slug));
  const { data: near } = useSuspenseQuery(nearbyQO(slug));
  if (!g) return null;
  const guide = g as any;
  const local = [guide.neighborhood, guide.city].filter(Boolean).join(" · ");
  const viaLabel = viaLabelOf(guide.via_type);
  const h1 = guide.h1 || `${guide.name} em Alphaville: localização, perfil da região e imóveis próximos`;

  const faqDefault: { question: string; answer: string }[] = Array.isArray(guide.faq) && guide.faq.length > 0
    ? guide.faq
    : [];

  const propertiesLabel =
    near.tier === "manual" ? `Imóveis próximos à ${guide.name}`
    : near.tier === "nearby" ? `Imóveis próximos à ${guide.name}`
    : near.tier === "region" ? `Imóveis em regiões próximas`
    : `Imóveis nesta região`;

  const nearbyPoints: { label: string; kind: string; distance?: string | null; url?: string | null }[] =
    Array.isArray(guide.nearby_points) ? guide.nearby_points : [];

  const profileTags: string[] = Array.isArray(guide.profile_tags) ? guide.profile_tags : [];

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative bg-navy-deep text-canvas overflow-hidden">
        {guide.og_image && (
          <img src={guide.og_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        )}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,17,35,0.65)_0%,rgba(8,14,28,0.95)_100%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-16">
          <nav aria-label="Trilha de navegação" className="mb-8 text-[10px] uppercase tracking-[0.25em] text-canvas/60">
            <Link to="/" className="hover:text-gold">Início</Link>
            <span aria-hidden className="px-2">/</span>
            <Link to="/guia-de-ruas-alphaville" className="hover:text-gold">Guia de Ruas</Link>
            <span aria-hidden className="px-2">/</span>
            <span className="text-canvas">{guide.name}</span>
          </nav>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">
            {viaLabel}{local ? ` · ${local}` : ""}
          </p>
          <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] tracking-tight text-balance max-w-[24ch]">
            {h1}
          </h1>
          {guide.short_description && (
            <p className="mt-8 text-lg text-canvas/80 leading-relaxed max-w-[60ch] text-pretty">
              {guide.short_description}
            </p>
          )}
          {profileTags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {profileTags.map((t) => (
                <span key={t} className="inline-flex items-center rounded-full bg-navy/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-gold ring-1 ring-gold/30">
                  {t.replaceAll("-", " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CONTEÚDO */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-4xl mx-auto space-y-12">
          {guide.intro_text && (
            <div className="prose prose-neutral max-w-none">
              <p className="text-base leading-relaxed text-ink/90 whitespace-pre-line">{guide.intro_text}</p>
            </div>
          )}
          {guide.long_description && (
            <div>
              <h2 className="font-serif text-2xl md:text-3xl text-ink mb-4">Resumo da localização e perfil da região</h2>
              <div className="text-base leading-relaxed text-muted-foreground whitespace-pre-line">{guide.long_description}</div>
            </div>
          )}
          {nearbyPoints.length > 0 && (
            <div>
              <h2 className="font-serif text-2xl md:text-3xl text-ink mb-4">Pontos de referência próximos</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                {nearbyPoints.map((p, i) => (
                  <li key={i} className="border-l-2 border-gold/50 pl-3">
                    <span className="text-ink font-medium">{p.label}</span>
                    {p.distance && <span className="text-muted-foreground"> — {p.distance}</span>}
                    <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">{p.kind.replaceAll("-", " ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* IMÓVEIS PRÓXIMOS */}
      <section className="px-6 py-16 md:py-20 border-t border-ink/8 bg-canvas">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Imóveis</p>
              <h2 className="font-serif text-3xl md:text-4xl text-ink">{propertiesLabel}</h2>
            </div>
            <Link
              to="/imoveis"
              className="text-[10px] uppercase tracking-[0.25em] text-ink hover:text-gold border-b border-ink/40 hover:border-gold"
            >
              Ver todos os imóveis →
            </Link>
          </div>

          {near.items.length > 0 ? (
            <>
              {(near.tier === "region") && (
                <p className="text-xs text-muted-foreground mb-6">
                  Não encontramos imóveis ativos exatamente nesta via — mostrando opções em regiões próximas.
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {near.items.map((p: any) => (
                  <CleanPropertyCard
                    key={p.id}
                    slug={p.slug}
                    title={p.title}
                    image={p.images?.[0]}
                    region={p.region}
                    neighborhood={p.neighborhood}
                    city={p.city}
                    propertyType={p.property_type}
                    priceSale={p.price_sale}
                    priceRent={p.price_rent}
                    bedrooms={p.bedrooms}
                    parking={p.parking}
                    area={p.area}
                    internalCode={p.internal_code}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="border border-ink/10 p-8 md:p-10 bg-white">
              <p className="text-base text-ink leading-relaxed max-w-2xl">
                No momento, não encontramos imóveis ativos exatamente nesta localização.
                A <strong>S.A Imóveis Alphaville</strong> pode ajudar você a encontrar opções
                próximas, de acordo com seu perfil.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/imoveis" className="bg-ink text-canvas px-5 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/85">
                  Ver imóveis disponíveis
                </Link>
                <Link to="/contato" className="border border-ink px-5 py-3 text-xs uppercase tracking-widest text-ink hover:bg-ink hover:text-canvas">
                  Falar com a S.A Imóveis
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* LINKS INTERNOS */}
      <section className="px-6 py-16 border-t border-ink/8">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-2xl md:text-3xl text-ink mb-6">Continue explorando a região</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {[
              { to: "/guia-alphaville", label: "Guia de Alphaville" },
              { to: "/guia-tambore", label: "Guia de Tamboré" },
              { to: "/guia-barueri", label: "Guia de Barueri" },
              { to: "/guia-santana-de-parnaiba", label: "Guia de Santana de Parnaíba" },
              { to: "/condominios", label: "Condomínios de Alphaville" },
              { to: "/imoveis", label: "Todos os imóveis" },
              { to: "/escolas", label: "Escolas próximas" },
              { to: "/restaurantes", label: "Restaurantes" },
              { to: "/mercado-imobiliario", label: "Mercado imobiliário" },
            ].map((l) => (
              <Link key={l.to} to={l.to as never} className="border border-ink/10 px-4 py-3 hover:border-ink hover:bg-ink hover:text-canvas transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faqDefault.length > 0 && (
        <section className="px-6 py-16 border-t border-ink/8 bg-canvas">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-8">Perguntas frequentes sobre {guide.name}</h2>
            <div className="divide-y divide-ink/10">
              {faqDefault.map((f, i) => (
                <details key={i} className="group py-5">
                  <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                    <span className="font-medium text-ink">{f.question}</span>
                    <span aria-hidden className="text-gold text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="px-6 py-20 bg-navy-deep text-canvas">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">S.A Imóveis Alphaville</p>
          <p className="font-serif text-2xl md:text-3xl leading-snug text-balance">
            Procurando imóvel perto da {guide.name}? A S.A Imóveis Alphaville ajuda você a encontrar
            opções alinhadas ao seu perfil, com conhecimento real da região e atendimento próximo.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/imoveis" className="bg-gold text-navy-deep px-6 py-3 text-xs uppercase tracking-widest font-bold hover:brightness-95">
              Ver imóveis disponíveis
            </Link>
            <Link to="/contato" className="border border-gold text-gold px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-gold hover:text-navy-deep">
              Falar com a S.A Imóveis
            </Link>
          </div>
        </div>
      </section>

      <InstitutionalBlock />
    </SiteLayout>
  );
}
