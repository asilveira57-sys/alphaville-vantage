import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { PremiumPostCard } from "@/components/premium-cards/post-card";
import { PremiumRegionCard } from "@/components/premium-cards/region-card";
import { listPublishedPosts } from "@/lib/blog.functions";

const postsQO = queryOptions({
  queryKey: ["publishedPosts"],
  queryFn: () => listPublishedPosts(),
});

const GUIAS = [
  { slug: "alphaville", to: "/guia-alphaville", title: "Alphaville", description: "Dossiê completo sobre o primeiro grande complexo de condomínios fechados do Brasil." },
  { slug: "tambore", to: "/guia-tambore", title: "Tamboré", description: "Residenciais de luxo, clubes, escolas e mercado em valorização." },
  { slug: "barueri", to: "/guia-barueri", title: "Barueri", description: "Polo corporativo: história, benefícios fiscais, empresas e mobilidade." },
  { slug: "santana", to: "/guia-santana-de-parnaiba", title: "Santana de Parnaíba", description: "Centro histórico tombado, gastronomia e novos condomínios." },
];

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog — S.A Imóveis Alphaville" },
      { name: "description", content: "Reportagens e análises sobre Alphaville, Tamboré, Barueri e Santana de Parnaíba: mercado imobiliário, arquitetura, história e estilo de vida." },
      { property: "og:title", content: "Blog — S.A Imóveis Alphaville" },
      { property: "og:description", content: "Reportagens editoriais sobre a região de Alphaville." },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQO),
  component: BlogIndex,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="max-w-2xl mx-auto px-6 py-24 text-sm text-red-600">{error.message}</div>
    </SiteLayout>
  ),
  notFoundComponent: () => <div />,
});

function BlogIndex() {
  const { data: posts } = useSuspenseQuery(postsQO);
  const [featured, ...rest] = posts;
  const topSecondary = rest.slice(0, 2);
  const recent = rest.slice(2);

  return (
    <SiteLayout>
      {/* Hero editorial */}
      <section className="bg-navy-deep text-canvas px-6 pt-20 pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">Central Editorial</p>
          <h1 className="font-serif text-4xl md:text-6xl font-medium leading-[1.05] max-w-[22ch] text-balance">
            Reportagens e curadoria sobre a região de Alphaville
          </h1>
          <p className="mt-6 text-base md:text-lg text-canvas/70 max-w-[62ch] leading-relaxed">
            Mercado imobiliário, arquitetura, história e estilo de vida em Alphaville, Tamboré,
            Barueri e Santana de Parnaíba.
          </p>
        </div>
      </section>

      {/* Matérias em destaque */}
      {featured && (
        <section className="bg-navy-deep text-canvas px-6 pb-20">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PremiumPostCard
                to="/blog/$slug"
                params={{ slug: featured.slug }}
                title={featured.title}
                excerpt={featured.excerpt}
                image={featured.featured_image}
                eyebrow={featured.tags?.[0] ?? "Matéria em destaque"}
                publishedAt={featured.published_at}
                featured
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
              {topSecondary.map((p) => (
                <PremiumPostCard
                  key={p.id}
                  to="/blog/$slug"
                  params={{ slug: p.slug }}
                  title={p.title}
                  excerpt={p.excerpt}
                  image={p.featured_image}
                  eyebrow={p.tags?.[0] ?? "Editorial"}
                  publishedAt={p.published_at}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Guias regionais */}
      <section className="bg-canvas px-6 py-20 md:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">Guias Regionais</p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium text-ink">
                Explore por cidade
              </h2>
            </div>
            <Link to="/bairros" className="text-[11px] uppercase tracking-[0.22em] text-ink/70 hover:text-ink">
              Todos os bairros →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {GUIAS.map((g) => (
              <PremiumRegionCard key={g.slug} to={g.to} slug={g.slug} title={g.title} description={g.description} />
            ))}
          </div>
        </div>
      </section>

      {/* Posts recentes */}
      {recent.length > 0 && (
        <section className="bg-navy-deep text-canvas px-6 py-20 md:py-24">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-10 gap-4 flex-wrap border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">Publicações</p>
                <h2 className="font-serif text-3xl md:text-4xl font-medium">Últimas matérias</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recent.map((p) => (
                <PremiumPostCard
                  key={p.id}
                  to="/blog/$slug"
                  params={{ slug: p.slug }}
                  title={p.title}
                  excerpt={p.excerpt}
                  image={p.featured_image}
                  eyebrow={p.tags?.[0] ?? "Editorial"}
                  publishedAt={p.published_at}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {posts.length === 0 && (
        <section className="bg-canvas px-6 py-24">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">Em breve</p>
            <h2 className="font-serif text-3xl text-ink mb-4">Novas matérias em produção</h2>
            <p className="text-muted-foreground">
              Nossa equipe editorial está preparando as próximas reportagens sobre a região.
            </p>
          </div>
        </section>
      )}

      <InstitutionalBlock />
    </SiteLayout>
  );
}
