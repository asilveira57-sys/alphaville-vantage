import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";
import { listPublishedPosts } from "@/lib/blog.functions";

const postsQO = queryOptions({
  queryKey: ["publishedPosts"],
  queryFn: () => listPublishedPosts(),
});

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
    <SectionPage eyebrow="Erro" title="Não foi possível carregar o blog" lead={error.message} breadcrumbs={[{ label: "Blog" }]}>
      <div />
    </SectionPage>
  ),
  notFoundComponent: () => <div />,
});

function BlogIndex() {
  const { data: posts } = useSuspenseQuery(postsQO);

  return (
    <SectionPage
      eyebrow="Editorial"
      title="O blog da região de Alphaville"
      lead="Reportagens, análises e curadoria sobre mercado imobiliário, arquitetura, história e estilo de vida em Alphaville, Tamboré, Barueri e Santana de Parnaíba."
      breadcrumbs={[{ label: "Blog" }]}
    >
      {posts.length === 0 ? (
        <ComingSoonGrid
          items={[
            { eyebrow: "Em breve", title: "Quem foi Yojiro Takaoka", lead: "A história do visionário por trás do projeto Alphaville." },
            { eyebrow: "Em breve", title: "Como nasceu Alphaville", lead: "Da pastagem ao primeiro condomínio fechado planejado do Brasil." },
            { eyebrow: "Em breve", title: "Top 10 condomínios de Alphaville", lead: "Os endereços mais valorizados e por quê." },
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {posts.map((p) => (
            <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="group">
              {p.featured_image && (
                <div className="aspect-[4/3] overflow-hidden bg-ink/5 mb-4">
                  <img src={p.featured_image} alt={p.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                </div>
              )}
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">{p.tags?.[0] ?? "Editorial"}</p>
              <h2 className="font-serif text-xl text-ink leading-snug mb-2 group-hover:underline underline-offset-4">{p.title}</h2>
              {p.excerpt && <p className="text-sm text-muted-foreground leading-relaxed">{p.excerpt}</p>}
            </Link>
          ))}
        </div>
      )}
    </SectionPage>
  );
}
