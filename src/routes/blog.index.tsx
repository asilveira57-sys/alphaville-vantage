import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useEffect, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { PremiumPostCard } from "@/components/premium-cards/post-card";
import { PremiumRegionCard } from "@/components/premium-cards/region-card";
import { listPublishedPosts } from "@/lib/blog.functions";
import { supabase } from "@/integrations/supabase/client";

const postsQO = queryOptions({
  queryKey: ["publishedPosts"],
  queryFn: () => listPublishedPosts(),
});

const GUIDE_SLUGS = [
  "guia-alphaville",
  "guia-tambore",
  "guia-barueri",
  "guia-santana-de-parnaiba",
];

const guideImagesQO = queryOptions({
  queryKey: ["guide-region-card-images"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("editorial_pages")
      .select("slug,featured_image")
      .in("slug", GUIDE_SLUGS);
    if (error) throw new Error(error.message);
    return Object.fromEntries(
      (data ?? [])
        .filter((row) => Boolean(row.featured_image))
        .map((row) => [row.slug, row.featured_image as string]),
    );
  },
});

const GUIAS = [
  { slug: "alphaville", to: "/guia-alphaville", title: "Alphaville", description: "Dossiê completo sobre o primeiro grande complexo de condomínios fechados do Brasil." },
  { slug: "tambore", to: "/guia-tambore", title: "Tamboré", description: "Residenciais de luxo, clubes, escolas e mercado em valorização." },
  { slug: "barueri", to: "/guia-barueri", title: "Barueri", description: "Polo corporativo: história, benefícios fiscais, empresas e mobilidade." },
  { slug: "santana", to: "/guia-santana-de-parnaiba", title: "Santana de Parnaíba", description: "Centro histórico tombado, gastronomia e novos condomínios." },
];

const blogSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  tag: fallback(z.string(), "").default(""),
  page: fallback(z.number().int(), 1).default(1),
});

const PER_PAGE = 12;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const Route = createFileRoute("/blog/")({
  validateSearch: zodValidator(blogSearchSchema),
  head: () => ({
    meta: [
      { title: "Blog — S.A Imóveis Alphaville" },
      { name: "description", content: "Reportagens e análises sobre Alphaville, Tamboré, Barueri e Santana de Parnaíba: mercado imobiliário, arquitetura, história e estilo de vida." },
      { property: "og:title", content: "Blog — S.A Imóveis Alphaville" },
      { property: "og:description", content: "Reportagens editoriais sobre a região de Alphaville." },
      { property: "og:url", content: "/blog" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(postsQO),
    context.queryClient.ensureQueryData(guideImagesQO),
  ]),
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
  const { data: guideImages } = useSuspenseQuery(guideImagesQO);
  const { q, tag, page } = Route.useSearch();
  const navigate = useNavigate({ from: "/blog/" });

  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (term !== q) navigate({ search: (prev) => ({ ...prev, q: term, page: 1 }) });
    }, 300);
    return () => clearTimeout(t);
  }, [term, q, navigate]);

  const [featured, ...rest] = posts;
  const topSecondary = rest.slice(0, 2);
  const isFiltering = Boolean(q.trim() || tag);
  const pool = isFiltering ? posts : rest.slice(2);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) for (const t of p.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t);
  }, [posts]);

  const filtered = useMemo(() => {
    const needles = norm(q).split(/\s+/).filter(Boolean);
    return pool.filter((p) => {
      if (tag && !((p.tags ?? []) as string[]).some((t: string) => norm(t) === norm(tag))) return false;
      if (!needles.length) return true;
      const hay = norm([p.title, p.excerpt ?? "", (p.tags ?? []).join(" ")].join(" "));
      return needles.every((n) => hay.includes(n));
    });
  }, [pool, q, tag]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const recent = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const goPage = (n: number) => {
    navigate({ search: (prev) => ({ ...prev, page: n }) });
    if (typeof window !== "undefined") {
      document.getElementById("ultimas-materias")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };


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
      {featured && !isFiltering && (
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
              <PremiumRegionCard
                key={g.slug}
                to={g.to}
                slug={g.slug}
                title={g.title}
                description={g.description}
                image={guideImages[g.to.slice(1)]}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Posts recentes + filtros + paginação */}
      {posts.length > 0 && (
        <section id="ultimas-materias" className="bg-navy-deep text-canvas px-6 py-20 md:py-24">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-6 gap-4 flex-wrap border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">Publicações</p>
                <h2 className="font-serif text-3xl md:text-4xl font-medium">
                  {isFiltering ? "Resultados da busca" : "Últimas matérias"}
                </h2>
              </div>
              <label className="relative w-full sm:w-80">
                <span className="sr-only">Buscar matérias</span>
                <input
                  type="search"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Buscar por Alphaville, supermercado…"
                  className="w-full bg-white/5 border border-white/15 focus:border-gold/60 outline-none px-4 py-3 text-sm text-canvas placeholder:text-canvas/40 transition-colors"
                />
              </label>
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                <button
                  type="button"
                  onClick={() => navigate({ search: (prev) => ({ ...prev, tag: "", page: 1 }) })}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] border transition-colors ${
                    !tag ? "border-gold text-gold" : "border-white/15 text-canvas/60 hover:text-canvas"
                  }`}
                >
                  Todas
                </button>
                {allTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      navigate({ search: (prev) => ({ ...prev, tag: tag === t ? "" : t, page: 1 }) })
                    }
                    className={`px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] border transition-colors ${
                      tag === t ? "border-gold text-gold" : "border-white/15 text-canvas/60 hover:text-canvas"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <p className="text-[11px] uppercase tracking-[0.22em] text-canvas/50 mb-8">
              {filtered.length} {filtered.length === 1 ? "matéria encontrada" : "matérias encontradas"}
            </p>

            {recent.length > 0 ? (
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
            ) : (
              <div className="border border-white/10 py-16 text-center">
                <p className="font-serif text-2xl mb-2">Nenhuma matéria encontrada</p>
                <p className="text-sm text-canvas/60">Tente outro termo ou remova os filtros.</p>
              </div>
            )}

            {totalPages > 1 && (
              <nav className="mt-12 flex items-center justify-center gap-2 flex-wrap" aria-label="Paginação">
                <button
                  type="button"
                  onClick={() => goPage(safePage - 1)}
                  disabled={safePage === 1}
                  className="px-4 py-2 text-[11px] uppercase tracking-[0.18em] border border-white/15 disabled:opacity-30 hover:border-gold/60 transition-colors"
                >
                  Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                  .map((n, idx, arr) => (
                    <span key={n} className="flex items-center gap-2">
                      {idx > 0 && arr[idx - 1] !== n - 1 && <span className="text-canvas/40">…</span>}
                      <button
                        type="button"
                        onClick={() => goPage(n)}
                        aria-current={n === safePage ? "page" : undefined}
                        className={`min-w-10 px-3 py-2 text-[11px] border transition-colors ${
                          n === safePage
                            ? "border-gold text-gold"
                            : "border-white/15 text-canvas/70 hover:text-canvas"
                        }`}
                      >
                        {n}
                      </button>
                    </span>
                  ))}
                <button
                  type="button"
                  onClick={() => goPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="px-4 py-2 text-[11px] uppercase tracking-[0.18em] border border-white/15 disabled:opacity-30 hover:border-gold/60 transition-colors"
                >
                  Próxima
                </button>
              </nav>
            )}
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
