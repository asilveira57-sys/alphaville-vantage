import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { EditorialContent } from "@/components/editorial-content";
import { InstitutionalBlock } from "@/components/section-page";
import { resolveImage } from "@/lib/image-fallbacks";
import { getPostBySlug } from "@/lib/blog.functions";

const postQO = (slug: string) => queryOptions({
  queryKey: ["post", slug],
  queryFn: () => getPostBySlug({ data: { slug } }),
});

function estimateReadMinutes(html: string | null | undefined) {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, " ").trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words === 0) return null;
  return Math.max(1, Math.round(words / 220));
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

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
    <SiteLayout>
      <div className="max-w-2xl mx-auto px-6 py-24 text-sm text-red-600">{error.message}</div>
    </SiteLayout>
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
  const cover = resolveImage(post.featured_image, { type: "post", seed: post.slug });
  const category = post.tags?.[0] ?? "Editorial";
  const date = fmtDate(post.published_at);
  const readMin = estimateReadMinutes(post.html_content);

  return (
    <SiteLayout>
      {/* Cover with overlay */}
      <header className="relative isolate bg-navy-deep text-canvas">
        <img
          src={cover}
          alt={post.title}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,14,28,0.35)_0%,rgba(8,14,28,0.75)_60%,rgba(8,14,28,0.95)_100%)]"
        />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28">
          <Link to="/blog" className="text-[10px] uppercase tracking-[0.3em] text-gold hover:text-gold-soft">
            ← Central Editorial
          </Link>
          <span className="mt-8 inline-flex items-center rounded-full bg-navy/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold ring-1 ring-gold/30 backdrop-blur">
            {category}
          </span>
          <h1 className="mt-5 font-serif text-4xl md:text-6xl font-medium leading-[1.05] text-balance">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-6 text-lg md:text-xl text-canvas/80 leading-relaxed max-w-[62ch]">
              {post.excerpt}
            </p>
          )}
          {(date || readMin) && (
            <p className="mt-8 text-[11px] uppercase tracking-[0.22em] text-canvas/60">
              {[date, readMin ? `${readMin} min de leitura` : null].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </header>

      {/* Body */}
      <article className="bg-canvas px-6 py-16 md:py-24">
        <div className="max-w-2xl mx-auto">
          <EditorialContent html={post.html_content ?? ""} />
        </div>
      </article>

      {/* CTA premium */}
      <section className="bg-navy-deep text-canvas px-6 py-16 md:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">S.A Imóveis Alphaville</p>
          <h2 className="font-serif text-3xl md:text-4xl font-medium mb-4 text-balance">
            Encontre o imóvel certo em Alphaville e região
          </h2>
          <p className="text-canvas/70 mb-8 max-w-[52ch] mx-auto leading-relaxed">
            Curadoria de imóveis residenciais e comerciais em Alphaville, Tamboré, Barueri e Santana de Parnaíba.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/imoveis"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-navy-deep transition hover:bg-gold-soft"
            >
              Ver imóveis →
            </Link>
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-canvas transition hover:border-gold hover:text-gold"
            >
              Mais matérias
            </Link>
          </div>
        </div>
      </section>

      <InstitutionalBlock />
    </SiteLayout>
  );
}
