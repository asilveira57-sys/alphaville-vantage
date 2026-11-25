import { SITE_URL } from "@/lib/site";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { getRedirectFor } from "@/lib/seo.functions";
import { useSuspenseQuery, useQuery, queryOptions } from "@tanstack/react-query";
import { ResolvedCta } from "@/components/resolved-cta";
import { ctaPillarGroup } from "@/lib/cta.functions";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { ListingSelections } from "@/components/listing-pages/listing-selections";
import { EditorialContent } from "@/components/editorial-content";
import { getEditorialBySlug, listRelated } from "@/lib/editorial.functions";
import { CondoPropertiesBlock } from "@/components/condominios/condo-properties-block";
import { AreaOverviewBlock } from "@/components/area-overview-block";
import { getAreaOverview } from "@/lib/area-overview.functions";
import { computedAreaFaq, type AreaOverview } from "@/lib/street-overview";
import { YouTubeVideo } from "@/components/youtube-video";
import { videoObjectScript } from "@/lib/youtube";
import { EDITORIAL_AUTHOR, EDITORIAL_PUBLISHER, topicPropsQO, topicBlockTitle } from "@/lib/editorial-topic-properties";


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

const areaQO = (slug: string) => queryOptions({
  queryKey: ["editorial", "guia", "area", slug],
  queryFn: () => getAreaOverview({ data: { slug } }),
});

type FaqItem = { question: string; answer: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped editorial row
function guiaFaq(p: any, area?: AreaOverview | null): FaqItem[] {
  const own: FaqItem[] = Array.isArray(p?.faq) ? p.faq.filter((f: FaqItem) => f?.question && f?.answer) : [];
  const calc = area && area.onde ? computedAreaFaq(area.onde, area.total > 0 ? area : null, area.nearby) : [];
  return [...own, ...calc];
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped editorial row
function guiaFaqScripts(p: any, area?: AreaOverview | null) {
  const items = guiaFaq(p, area);
  if (!items.length) return [];
  return [{
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    }),
  }];
}

export const Route = createFileRoute("/guia/$slug")({
  loader: async ({ params, context }) => {
    const page = await context.queryClient.ensureQueryData(pageQO(params.slug));
    if (!page || page.content_type !== "guia") {
      // Guia fundido/arquivado: 301 cadastrado em seo_redirects.
      const r = await getRedirectFor({ data: { path: `/guia/${params.slug}` } }).catch(() => null);
      if (r?.new_url) throw redirect({ href: r.new_url, statusCode: r.redirect_type === 302 ? 302 : 301 });
      throw notFound();
    }
    await context.queryClient.ensureQueryData(relatedQO(params.slug));
    const area = await context.queryClient.ensureQueryData(areaQO(params.slug)).catch(() => null);
    await context.queryClient.ensureQueryData(topicPropsQO("guia", params.slug, page as never)).catch(() => null);
    return { page, area };
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
      scripts: [...guiaFaqScripts(p, loaderData?.area ?? null), ...videoObjectScript((p as { video?: unknown }).video, { title: p.title, description: p.excerpt, pageUrl: url }), {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": p.schema_type ?? "Article",
          headline: p.title,
          description: p.excerpt ?? undefined,
          image: image ?? undefined,
          url,
          datePublished: p.published_at ?? undefined,
          dateModified: p.updated_at ?? p.published_at ?? undefined,
          author: { "@type": "Organization", name: EDITORIAL_AUTHOR, url: SITE_URL },
          publisher: { "@type": "Organization", name: EDITORIAL_PUBLISHER, url: SITE_URL },
        }),
      }],
    };
  },
  component: GuiaPage,
  errorComponent: ({ error }) => (
    <SiteLayout><section className="px-6 py-24 max-w-3xl mx-auto"><p className="text-sm">{(error as Error).message}</p></section></SiteLayout>
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
  const { data: topic } = useQuery(topicPropsQO("guia", slug, page as never));
  const { data: area } = useQuery(areaQO(slug));
  const faqItems = guiaFaq(page, area ?? null);
  if (!page) return null;
  const updatedLabel = (() => {
    const d = new Date(page.updated_at ?? page.published_at ?? "");
    return isNaN(d.getTime()) ? null : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  })();

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
          <p className="mt-6 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {[`Por ${EDITORIAL_AUTHOR}`, updatedLabel ? `Atualizado em ${updatedLabel}` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
      </section>

      <YouTubeVideo video={(page as { video?: unknown }).video} fallbackTitle={page.title} className="border-b border-ink/8" />

      {page.featured_image && !(page as { video?: { url?: string } | null }).video?.url && (
        <section className="px-6 py-12 bg-ink/[0.02]">
          <div className="max-w-5xl mx-auto"><img width={800} height={600} decoding="async" src={page.featured_image} alt={page.title} className="w-full h-auto" loading="lazy" /></div>
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

      {area && <AreaOverviewBlock slug={slug} o={area} />}

      {faqItems.length > 0 && (
        <section className="px-6 py-16 border-t border-ink/8">
          <div className="max-w-3xl mx-auto">
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
          </div>
        </section>
      )}

      {topic && topic.items.length > 0 && (
        <CondoPropertiesBlock
          title={topicBlockTitle(page)}
          condominiumName={topic.condominiumName ?? null}
          items={topic.items}
          rentItems={topic.rentItems}
          saleItems={topic.saleItems}
        />
      )}

      {related.length > 0 && (
        <section className="px-6 py-16 border-t border-ink/8 bg-ink/[0.02]">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-2xl mb-8">Outros guias</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {related.map((r) => (
                <Link key={r.id} to="/guia/$slug" params={{ slug: r.slug }} className="group block">
                  {r.featured_image && <div className="aspect-[4/3] bg-ink/5 overflow-hidden mb-3"><img width={800} height={600} decoding="async" src={r.featured_image} alt={r.title} className="w-full h-full object-cover" loading="lazy" /></div>}
                  <h3 className="font-serif text-lg group-hover:underline">{r.title}</h3>
                  {r.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{r.excerpt}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <ResolvedCta
        contentType="guia"
        keys={ctaPillarGroup((page as { categoria_editorial?: string | null }).categoria_editorial) ? [`guia:${ctaPillarGroup((page as { categoria_editorial?: string | null }).categoria_editorial)}`] : []}
        vars={{ titulo: page.title, bairro: area?.label ?? (page as { bairro?: string | null }).bairro ?? "" }}
        ctaId={(page as { cta_id?: string | null }).cta_id ?? null}
        hidden={(page as { cta_hidden?: boolean | null }).cta_hidden ?? false}
        legacy={{
          title: (page as { cta_title?: string | null }).cta_title,
          text: (page as { cta_text?: string | null }).cta_text,
          buttonLabel: (page as { cta_button_label?: string | null }).cta_button_label,
          buttonUrl: (page as { cta_button_url?: string | null }).cta_button_url,
        }}
      />

      <ListingSelections title="Imóveis em Alphaville por perfil" />

      <InstitutionalBlock />
    </SiteLayout>
  );
}
