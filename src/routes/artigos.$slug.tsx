import { createFileRoute, notFound } from "@tanstack/react-router";
import { EditorialArticle } from "@/components/editorial-article";
import { getSymbolicArticle, SYMBOLIC_ARTICLES } from "@/lib/symbolic-articles";

export const Route = createFileRoute("/artigos/$slug")({
  loader: ({ params }) => {
    const article = getSymbolicArticle(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData, params }) => {
    const article = loaderData?.article;
    if (!article) return {};
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
  const { article } = Route.useLoaderData();
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
