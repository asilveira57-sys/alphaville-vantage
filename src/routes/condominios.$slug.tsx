import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { EditorialContent } from "@/components/editorial-content";
import { PremiumCondoCard } from "@/components/premium-cards/condo-card";
import { CondoPropertiesBlock } from "@/components/condominios/condo-properties-block";
import { ResolvedCta } from "@/components/resolved-cta";

import { getEditorialBySlug, listRelated } from "@/lib/editorial.functions";
import { listCondoProperties } from "@/lib/condo-properties.functions";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const pageQO = (slug: string) => queryOptions({
  queryKey: ["editorial", "condominio", slug],
  queryFn: () => getEditorialBySlug({ data: { slug } }),
});
const relatedQO = (slug: string) => queryOptions({
  queryKey: ["editorial", "condominio", "related", slug],
  queryFn: () => listRelated({ data: { type: "condominio", excludeSlug: slug, limit: 3 } }),
});
type PropsArgs = { condominiumId: string | null; condoTerms: string[]; includedIds: string[]; excludedIds: string[]; titleFallback: string };
const propsQO = (slug: string, a: PropsArgs) => queryOptions({
  queryKey: ["condominio", "properties", slug, a],
  queryFn: () => listCondoProperties({ data: a }),
});
const propsArgsFrom = (page: Record<string, unknown> | null | undefined): PropsArgs => ({
  condominiumId: (page?.["related_condominium"] as string | null) ?? null,
  condoTerms: (page?.["properties_condo_terms"] as string[] | null) ?? [],
  includedIds: (page?.["properties_included_ids"] as string[] | null) ?? [],
  excludedIds: (page?.["properties_excluded_ids"] as string[] | null) ?? [],
  titleFallback: (page?.["title"] as string | null) ?? "",
});

export const Route = createFileRoute("/condominios/$slug")({
  loader: async ({ params, context }) => {
    const page = await context.queryClient.ensureQueryData(pageQO(params.slug));
    if (!page || page.content_type !== "condominio") throw notFound();
    await context.queryClient.ensureQueryData(relatedQO(params.slug));
    await context.queryClient.ensureQueryData(propsQO(params.slug, propsArgsFrom(page as never)));
    return { page };
  },

  head: ({ params, loaderData }) => {
    const p = loaderData?.page;
    const url = `${SITE_URL}/condominios/${params.slug}`;
    if (!p) return { meta: [{ title: "Condomínio — S.A Imóveis Alphaville" }] };
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
          ...(p.related_neighborhood ? { address: { "@type": "PostalAddress", addressLocality: p.related_neighborhood } } : {}),
        }),
      }],
    };
  },
  component: CondoPage,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground">Erro: {error.message}</p>
        <Link to="/condominios" className="mt-6 inline-block text-sm underline">Voltar à lista</Link>
      </section>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl mb-4">Condomínio não encontrado</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Ainda não publicamos esta página. Volte em breve ou explore a lista completa.
        </p>
        <Link to="/condominios" className="text-sm underline">Ver condomínios</Link>
      </section>
    </SiteLayout>
  ),
});

function CondoPage() {
  const { slug } = Route.useParams();
  const { data: page } = useSuspenseQuery(pageQO(slug));
  const { data: related } = useSuspenseQuery(relatedQO(slug));
  const { data: propsData } = useSuspenseQuery(propsQO(slug, propsArgsFrom(page as never)));
  if (!page) return null;
  const blockEnabled = (page as { properties_block_enabled?: boolean }).properties_block_enabled !== false;
  const blockTitle =
    (page as { properties_block_title?: string | null }).properties_block_title?.trim() ||
    `Imóveis no ${page.title}`;


  return (
    <SiteLayout>
      <section className="px-6 pt-16 md:pt-24 pb-12 border-b border-ink/8">
        <div className="max-w-5xl mx-auto">
          <nav aria-label="Trilha" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <li><Link to="/" className="hover:text-ink">Início</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><Link to="/condominios" className="hover:text-ink">Condomínios</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><span className="text-ink">{page.title}</span></li>
            </ol>
          </nav>
          {page.related_neighborhood && (
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">
              Condomínio · {page.related_neighborhood}
            </p>
          )}
          <h1 className="font-serif text-5xl md:text-6xl font-medium leading-[1.05] tracking-tight text-balance max-w-[22ch]">{page.title}</h1>
          {page.excerpt && (
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-[60ch] text-pretty">{page.excerpt}</p>
          )}
        </div>
      </section>

      {page.featured_image && (
        <section className="px-6 py-12 bg-ink/[0.02]">
          <div className="max-w-5xl mx-auto">
            <img src={page.featured_image} alt={page.title} className="w-full h-auto" loading="lazy" />
          </div>
        </section>
      )}

      <section className="px-6 py-16 border-t border-ink/8">
        <div className="max-w-3xl mx-auto">
          <EditorialContent html={page.html_content} />
        </div>
      </section>

      {blockEnabled && (
        <CondoPropertiesBlock
          title={blockTitle}
          condominiumName={propsData.condominiumName ?? page.title}
          items={propsData.items}
        />
      )}

      <ResolvedCta
        contentType="condominio"
        ctaId={(page as { cta_id?: string | null }).cta_id ?? null}
        hidden={(page as { cta_hidden?: boolean | null }).cta_hidden ?? false}
        legacy={{
          title: (page as { cta_title?: string | null }).cta_title,
          text: (page as { cta_text?: string | null }).cta_text,
          buttonLabel: (page as { cta_button_label?: string | null }).cta_button_label,
          buttonUrl: (page as { cta_button_url?: string | null }).cta_button_url,
        }}
      />







      {related.length > 0 && (
        <section className="px-6 py-16 border-t border-ink/8 bg-ink/[0.02]">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-2xl mb-8">Veja também</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {related.map((r) => (
                <PremiumCondoCard
                  key={r.id}
                  slug={r.slug}
                  title={r.title}
                  image={r.featured_image}
                  neighborhood={r.related_neighborhood}
                  excerpt={r.excerpt}
                />
              ))}
            </div>

          </div>
        </section>
      )}

      <InstitutionalBlock />
    </SiteLayout>
  );
}
