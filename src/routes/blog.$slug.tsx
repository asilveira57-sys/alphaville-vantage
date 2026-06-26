import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { EditorialContent } from "@/components/editorial-content";
import { getPostBySlug } from "@/lib/blog.functions";

const postQO = (slug: string) => queryOptions({
  queryKey: ["post", slug],
  queryFn: () => getPostBySlug({ data: { slug } }),
});

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params, context }) => {
    const post = await context.queryClient.ensureQueryData(postQO(params.slug));
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    if (!p) return { meta: [{ title: "Post — S.A Imóveis Alphaville" }] };
    return {
      meta: [
        { title: `${p.meta_title ?? p.title} — S.A Imóveis Alphaville` },
        { name: "description", content: p.meta_description ?? p.excerpt ?? "" },
        { property: "og:title", content: p.title },
        { property: "og:description", content: p.excerpt ?? "" },
        ...(p.featured_image ? [{ property: "og:image", content: p.featured_image }] : []),
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: `/blog/${p.slug}` }],
    };
  },
  component: PostPage,
  errorComponent: ({ error }) => (
    <SiteLayout><div className="max-w-2xl mx-auto px-6 py-24 text-sm text-red-600">{error.message}</div></SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-ink mb-2">Post não encontrado</h1>
        <Link to="/blog" className="text-xs uppercase tracking-widest hover:underline">Voltar ao blog</Link>
      </div>
    </SiteLayout>
  ),
});

function PostPage() {
  const { post } = Route.useLoaderData();
  return (
    <SiteLayout>
      <article className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/blog" className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-ink">← Blog</Link>
        <p className="mt-8 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{post.tags?.[0] ?? "Editorial"}</p>
        <h1 className="font-serif text-5xl text-ink leading-[1.05] mt-3 mb-6">{post.title}</h1>
        {post.excerpt && <p className="text-lg text-muted-foreground leading-relaxed mb-12">{post.excerpt}</p>}
        {post.featured_image && (
          <img src={post.featured_image} alt={post.title} className="w-full mb-12" />
        )}
        <EditorialContent html={post.html_content ?? ""} />
      </article>
    </SiteLayout>
  );
}
