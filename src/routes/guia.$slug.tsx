import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { EditorialContent } from "@/components/editorial-content";
import { getEditorialBySlug, listRelated } from "@/lib/editorial.functions";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const SECTIONS = [
  { id: "historia", label: "História" },
  { id: "mobilidade", label: "Mobilidade e acesso" },
  { id: "servicos", label: "Serviços e comércio" },
  { id: "qualidade-de-vida", label: "Qualidade de vida" },
  { id: "perguntas-frequentes", label: "Perguntas frequentes" },
];

const pageQO = (slug: string) => queryOptions({
  queryKey: ["editorial", "guia", slug],
  queryFn: () => getEditorialBySlug({ data: { slug } }),
});
const relatedQO = (slug: string) => queryOptions({
  queryKey: ["editorial", "guia", "related", slug],
  queryFn: () => listRelated({ data: { type: "guia", excludeSlug: slug, limit: 3 } }),
});

export const Route = createFileRoute("/guia/$slug")({
  loader: async ({ params, context }) => {
    const page = await context.queryClient.ensureQueryData(pageQO(params.slug));
    if (!page || page.content_type !== "guia") throw notFound();
    await context.queryClient.ensureQueryData(relatedQO(params.slug));
    return { page };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.page;
    const url = `${SITE_URL}/guia/${params.slug}`;
    if (!p) return { meta: [{ title: "Guia — S.A Imóveis Alphaville" }] };
    const title = p.meta_title ?? `${p.title} — Guia do bairro`;
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
          "@type": p.schema_type ?? "Article",
          headline: p.title,
          description: p.excerpt ?? undefined,
          image: image ?? undefined,
          url,
        }),
      }],
    };
  },
  component: GuiaPage,
  errorComponent: ({ error }) => (
    <SiteLayout><section className="px-6 py-24 max-w-3xl mx-auto"><p className="text-sm">{error.message}</p></section></SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl mb-4">Guia não encontrado</h1>
        <Link to="/guia" className="text-sm underline">Ver todos os guias</Link>
      </section>
    </SiteLayout>
  ),
});

function GuiaPage() {
  const { slug } = Route.useParams();
  const { data: page } = useSuspenseQuery(pageQO(slug));
  const { data: related } = useSuspenseQuery(relatedQO(slug));
  if (!page) return null;

  const html = page.html_content ?? "";
  const presentSections = SECTIONS.filter((s) => new RegExp(`id=["']${s.id}["']`).test(html));

  return (
    <SiteLayout>
      <section className="px-6 pt-16 md:pt-24 pb-12 border-b border-ink/8">
        <div className="max-w-5xl mx-auto">
          <nav aria-label="Trilha" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <li><Link to="/" className="hover:text-ink">Início</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><Link to="/guia" className="hover:text-ink">Guias</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><span className="text-ink">{page.title}</span></li>
            </ol>
          </nav>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Guia do bairro</p>
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
        {presentSections.length > 0 ? (
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-12">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">Nesta página</p>
              <ul className="space-y-2 text-sm">
                {presentSections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-ink/70 hover:text-ink hover:underline underline-offset-4">{s.label}</a>
                  </li>
                ))}
              </ul>
            </aside>
            <div className="min-w-0">
              <EditorialContent html={html} />
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <EditorialContent html={html} />
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="px-6 py-16 border-t border-ink/8 bg-ink/[0.02]">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-2xl mb-8">Outros guias</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {related.map((r) => (
                <Link key={r.id} to="/guia/$slug" params={{ slug: r.slug }} className="group block">
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
