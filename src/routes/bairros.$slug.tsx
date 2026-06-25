import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { EditorialContent } from "@/components/editorial-content";
import { getEditorialBySlug, listRelated } from "@/lib/editorial.functions";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const pageQO = (slug: string) => queryOptions({
  queryKey: ["editorial", "bairro", slug],
  queryFn: () => getEditorialBySlug({ data: { slug } }),
});
const relatedQO = (slug: string) => queryOptions({
  queryKey: ["editorial", "bairro", "related", slug],
  queryFn: () => listRelated({ data: { type: "bairro", excludeSlug: slug, limit: 3 } }),
});

export const Route = createFileRoute("/bairros/$slug")({
  loader: async ({ params, context }) => {
    const page = await context.queryClient.ensureQueryData(pageQO(params.slug));
    if (!page || page.content_type !== "bairro") throw notFound();
    await context.queryClient.ensureQueryData(relatedQO(params.slug));
    return { page };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.page;
    const url = `${SITE_URL}/bairros/${params.slug}`;
    if (!p) return { meta: [{ title: "Bairro — S.A Imóveis Alphaville" }] };
    const title = p.meta_title ?? `${p.title} — S.A Imóveis Alphaville`;
    const description = p.meta_description ?? p.excerpt ?? "";
    const image = p.og_image ?? p.featured_image ?? undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: p.og_title ?? p.title },
        { property: "og:description", content: p.og_description ?? description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: p.canonical_url || url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": p.schema_type ?? "Place",
          name: p.title,
          description: p.excerpt ?? undefined,
          image: image ?? undefined,
          url,
        }),
      }],
    };
  },
  component: BairroPage,
  errorComponent: ({ error }) => (
    <SiteLayout><section className="px-6 py-24 max-w-3xl mx-auto"><p className="text-sm">{error.message}</p></section></SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl mb-4">Bairro não encontrado</h1>
        <Link to="/bairros" className="text-sm underline">Ver bairros</Link>
      </section>
    </SiteLayout>
  ),
});

function BairroPage() {
  const { slug } = Route.useParams();
  const { data: page } = useSuspenseQuery(pageQO(slug));
  const { data: related } = useSuspenseQuery(relatedQO(slug));
  if (!page) return null;
  return (
    <SiteLayout>
      <section className="px-6 pt-16 md:pt-24 pb-12 border-b border-ink/8">
        <div className="max-w-5xl mx-auto">
          <nav aria-label="Trilha" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <li><Link to="/" className="hover:text-ink">Início</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><Link to="/bairros" className="hover:text-ink">Bairros</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><span className="text-ink">{page.title}</span></li>
            </ol>
          </nav>
          <h1 className="font-serif text-5xl md:text-6xl font-medium leading-[1.05] tracking-tight text-balance max-w-[22ch]">{page.title}</h1>
          {page.excerpt && <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-[60ch] text-pretty">{page.excerpt}</p>}
        </div>
      </section>

      {page.featured_image && (
        <section className="px-6 py-12 bg-ink/[0.02]">
          <div className="max-w-5xl mx-auto"><img src={page.featured_image} alt={page.title} className="w-full h-auto" loading="lazy" /></div>
        </section>
      )}

      <section className="px-6 py-16 border-t border-ink/8">
        <div className="max-w-3xl mx-auto"><EditorialContent html={page.html_content} /></div>
      </section>

      {related.length > 0 && (
        <section className="px-6 py-16 border-t border-ink/8 bg-ink/[0.02]">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-2xl mb-8">Veja também</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {related.map((r) => (
                <Link key={r.id} to="/bairros/$slug" params={{ slug: r.slug }} className="group block">
                  {r.featured_image && <div className="aspect-[4/3] bg-ink/5 overflow-hidden mb-3"><img src={r.featured_image} alt={r.title} className="w-full h-full object-cover" loading="lazy" /></div>}
                  <h3 className="font-serif text-lg group-hover:underline">{r.title}</h3>
                  {r.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{r.excerpt}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <InstitutionalBlock />
    </SiteLayout>
  );
}
