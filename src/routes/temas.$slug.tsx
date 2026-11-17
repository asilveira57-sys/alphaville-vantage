import { SITE_URL } from "@/lib/site";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { PremiumPostCard } from "@/components/premium-cards/post-card";
import { ListingSelections } from "@/components/listing-pages/listing-selections";
import { getPillarPage } from "@/lib/pillars.functions";
import { PillarNav } from "@/components/pillar-nav";
import { EDITORIAL_PUBLISHER } from "@/lib/editorial-topic-properties";

/** Página de pilar editorial: lista os posts e guias do tema. Pilar sem conteúdo publicado responde 404. */

const pillarQO = (slug: string) => queryOptions({
  queryKey: ["pillar-page", slug],
  queryFn: () => getPillarPage({ data: { slug } }),
});

type Data = NonNullable<Awaited<ReturnType<typeof getPillarPage>>>;
const postPath = (p: { content_type: string; slug: string }) => `${p.content_type === "guia" ? "/guia" : "/blog"}/${p.slug}`;

export const Route = createFileRoute("/temas/$slug")({
  loader: async ({ params, context }) => {
    const d = await context.queryClient.ensureQueryData(pillarQO(params.slug));
    if (!d || d.posts.length === 0) throw notFound();
    return d;
  },
  head: ({ params, loaderData }) => {
    const d = loaderData as Data | undefined;
    if (!d) return { meta: [{ title: "Temas — S.A Imóveis Alphaville" }, { name: "robots", content: "noindex" }] };
    const url = `${SITE_URL}/temas/${params.slug}`;
    const title = `${d.pillar.h1} — S.A Imóveis Alphaville`;
    return {
      meta: [
        { title },
        { name: "description", content: d.pillar.metaDescription },
        { property: "og:title", content: d.pillar.h1 },
        { property: "og:description", content: d.pillar.metaDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: d.pillar.h1,
          description: d.pillar.metaDescription,
          url,
          publisher: { "@type": "Organization", name: EDITORIAL_PUBLISHER, url: SITE_URL },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: d.posts.length,
            itemListElement: d.posts.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}${postPath(p)}`, name: p.title })),
          },
        }),
      }],
    };
  },
  component: PillarPage,
  notFoundComponent: () => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto text-center">
        <h1 className="font-serif text-3xl mb-4">Tema em preparação</h1>
        <Link to="/blog" className="text-sm underline">Ver todas as matérias</Link>
      </section>
    </SiteLayout>
  ),
});

function PillarPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(pillarQO(slug));
  if (!data) return null;
  const d = data as Data;
  return (
    <SiteLayout>
      <section className="bg-navy-deep text-canvas px-6 pt-20 pb-12">
        <div className="max-w-7xl mx-auto">
          <nav aria-label="Trilha" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-canvas/50">
              <li><Link to="/" className="hover:text-canvas">Início</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><Link to="/blog" className="hover:text-canvas">Blog</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><span className="text-canvas">{d.pillar.label}</span></li>
            </ol>
          </nav>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">Tema · {d.posts.length} {d.posts.length === 1 ? "conteúdo" : "conteúdos"}</p>
          <h1 className="font-serif text-4xl md:text-6xl font-medium leading-[1.05] max-w-[22ch] text-balance">{d.pillar.h1}</h1>
          <p className="mt-6 text-base md:text-lg text-canvas/70 max-w-[62ch] leading-relaxed">{d.pillar.lead}</p>
          <div className="mt-10"><PillarNav items={d.all} current={slug} /></div>
        </div>
      </section>
      <section className="bg-navy-deep text-canvas px-6 pb-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {d.posts.map((p) => (
            <PremiumPostCard
              key={p.id}
              to={postPath(p)}
              title={p.title}
              excerpt={p.excerpt}
              image={p.card_image ?? p.featured_image}
              eyebrow={p.content_type === "guia" ? "Guia" : d.pillar.label}
              publishedAt={p.published_at}
            />
          ))}
        </div>
      </section>
      <ListingSelections title="Imóveis em Alphaville por perfil" />
    </SiteLayout>
  );
}
