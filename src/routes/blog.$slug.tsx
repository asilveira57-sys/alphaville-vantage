import { createFileRoute, notFound, Link, redirect } from "@tanstack/react-router";
import { queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { EditorialContent } from "@/components/editorial-content";
import { InstitutionalBlock } from "@/components/section-page";
import { PostHelpBlock } from "@/components/post-help-block";
import { ResolvedCta } from "@/components/resolved-cta";
import { resolveImage } from "@/lib/image-fallbacks";
import { getPostBySlug, listRelatedPosts } from "@/lib/blog.functions";
import { getRedirectFor } from "@/lib/seo.functions";


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
    if (!post) {
      const r = await getRedirectFor({ data: { path: `/blog/${params.slug}` } }).catch(() => null);
      if (r?.new_url) throw redirect({ href: r.new_url, statusCode: (r.redirect_type as 301 | 302) ?? 301 });
      throw notFound();
    }
    const related = await listRelatedPosts({
      data: { excludeSlug: params.slug, tags: (post as any).tags ?? [], limit: 3 },
    }).catch(() => []);
    return { post, related };

  },
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    if (!p) return { meta: [{ title: "Post — S.A Imóveis Alphaville" }] };
    const social = p.social_image || p.og_image || p.featured_image || null;
    const robots = `${p.robots_index === false ? "noindex" : "index"},${p.robots_follow === false ? "nofollow" : "follow"}`;
    return {
      meta: [
        { title: `${p.meta_title ?? p.title} — S.A Imóveis Alphaville` },
        { name: "description", content: p.meta_description ?? p.excerpt ?? "" },
        ...(p.meta_keywords ? [{ name: "keywords", content: p.meta_keywords }] : []),
        { name: "robots", content: robots },
        { property: "og:title", content: p.og_title || p.title },
        { property: "og:description", content: p.og_description || p.excerpt || "" },
        ...(social ? [{ property: "og:image", content: social }] : []),
        ...(social ? [{ name: "twitter:image", content: social }] : []),
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: p.canonical_url || `/blog/${p.slug}` }],
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
  const { post, related } = Route.useLoaderData() as { post: any; related: any[] };
  const cover = resolveImage(post.featured_image, { type: "post", seed: post.slug });
  const category = post.categoria_editorial || post.tags?.[0] || "Editorial";
  const date = fmtDate(post.published_at);
  const readMin = typeof post.reading_minutes === "number" && post.reading_minutes > 0
    ? post.reading_minutes
    : estimateReadMinutes(post.html_content);

  const faqItems: Array<{ question: string; answer: string }> = Array.isArray(post.faq)
    ? post.faq.filter((f: any) => f?.question && f?.answer)
    : [];

  const faqJsonLd = faqItems.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

  const helpContext = [post.categoria_editorial, post.cidade, post.bairro].filter(Boolean).join(" · ");

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

          {/* Bloco "Como a S.A. Imóveis pode ajudar" */}
          <PostHelpBlock
            title={post.help_title}
            text={post.help_text}
            buttonLabel={post.help_button_label}
            buttonUrl={post.help_button_url}
            context={helpContext || null}
          />

          {/* Perguntas frequentes */}
          {faqItems.length > 0 && (
            <section className="mt-12">
              <h2 className="font-serif text-2xl md:text-3xl text-ink mb-6">Perguntas frequentes</h2>
              <div className="divide-y divide-ink/10 border-y border-ink/10">
                {faqItems.map((f, i) => (
                  <details key={i} className="group py-4">
                    <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-ink font-medium">
                      <span>{f.question}</span>
                      <span aria-hidden className="text-ink/40 group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <div className="mt-3 text-ink/75 leading-relaxed whitespace-pre-line">{f.answer}</div>
                  </details>
                ))}
              </div>
              {faqJsonLd && (
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
                />
              )}
            </section>
          )}

          {/* Espaço reservado para personalização futura — desativado por padrão */}
          {/* personalization_enabled === true no futuro poderá substituir/complementar o CTA */}
        </div>
      </article>

      {/* CTA contextual */}
      {!post.personalization_enabled && (
        <ResolvedCta
          contentType={post.content_type || "blog"}
          ctaId={post.cta_id}
          hidden={post.cta_hidden}
          legacy={{
            title: post.cta_title,
            text: post.cta_text,
            buttonLabel: post.cta_button_label,
            buttonUrl: post.cta_button_url,
          }}
        />
      )}

      {/* Matérias relacionadas */}
      {related && related.length > 0 && (
        <section className="bg-canvas px-6 py-16 border-t border-ink/10">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-2">Continue lendo</p>
                <h2 className="font-serif text-2xl md:text-3xl text-ink">Matérias relacionadas</h2>
              </div>
              <Link to="/blog" className="text-[11px] uppercase tracking-widest hover:underline">Ver todas →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((r: any) => {
                const img = resolveImage(r.featured_image, { type: "post", seed: r.slug });
                return (
                  <Link
                    key={r.id}
                    to="/blog/$slug"
                    params={{ slug: r.slug }}
                    className="group block border border-ink/10 hover:border-ink/30 transition-colors"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-ink/5">
                      <img
                        src={img}
                        alt={r.title}
                        loading="lazy"
                        decoding="async"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="font-serif text-lg text-ink leading-tight group-hover:underline">{r.title}</h3>
                      {r.excerpt && <p className="mt-2 text-sm text-ink/70 line-clamp-3">{r.excerpt}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <InstitutionalBlock />
    </SiteLayout>
  );
}
