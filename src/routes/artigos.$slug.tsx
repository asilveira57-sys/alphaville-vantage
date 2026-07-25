import { createFileRoute, notFound } from "@tanstack/react-router";
import { EditorialArticle } from "@/components/editorial-article";
import { getSymbolicArticle, SYMBOLIC_ARTICLES } from "@/lib/symbolic-articles";
import { getEditorialBySlug } from "@/lib/editorial.functions";

export const Route = createFileRoute("/artigos/$slug")({
  loader: async ({ params }) => {
    const cms = await getEditorialBySlug({ data: { slug: params.slug } }).catch(() => null);
    if (cms) return { source: "cms" as const, cms };
    const article = getSymbolicArticle(params.slug);
    if (!article) throw notFound();
    return { source: "symbolic" as const, article };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return {};
    if (loaderData.source === "cms") {
      const p: any = loaderData.cms;
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
          { property: "og:url", content: `/artigos/${params.slug}` },
          ...(image ? [{ property: "og:image", content: image }] : []),
        ],
        links: [{ rel: "canonical", href: p.canonical_url || `/artigos/${params.slug}` }],
      };
    }
    const article = loaderData.article;
    return {
      meta: [
        { title: `${article.title} — S.A Imóveis Alphaville` },
        { name: "description", content: article.lead },
        { property: "og:title", content: article.title },
        { property: "og:description", content: article.lead },
        { property: "og:url", content: `/artigos/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `/artigos/${params.slug}` }],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">404</p>
        <h1 className="font-serif text-3xl mb-4">Artigo não encontrado</h1>
        <p className="text-muted-foreground text-sm mb-6">
          O artigo solicitado ainda não foi publicado. Veja os disponíveis:
        </p>
        <ul className="text-sm space-y-2">
          {Object.entries(SYMBOLIC_ARTICLES).slice(0, 6).map(([slug, a]) => (
            <li key={slug}>
              <a href={`/artigos/${slug}`} className="hover:underline">{a.title}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <div>
        <h1 className="font-serif text-2xl mb-3">Erro ao carregar artigo</h1>
        <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
        <button onClick={reset} className="text-sm underline">Tentar novamente</button>
      </div>
    </div>
  ),
  component: ArticleRoute,
});

function ArticleRoute() {
  const data = Route.useLoaderData();
  if (data.source === "cms") {
    const p: any = data.cms;
    const fallback = getSymbolicArticle(p.slug);
    return (
      <EditorialArticle
        eyebrow={fallback?.eyebrow ?? "Editorial"}
        title={p.title}
        lead={p.excerpt ?? fallback?.lead ?? ""}
        parent={fallback?.parent ?? { label: "Blog", to: "/blog" }}
        html={p.html_content ?? ""}
        related={fallback?.related}
      />
    );
  }
  const { article } = data;
  return (
    <EditorialArticle
      eyebrow={article.eyebrow}
      title={article.title}
      lead={article.lead}
      parent={article.parent}
      html={article.html}
      related={article.related}
    />
  );
}
