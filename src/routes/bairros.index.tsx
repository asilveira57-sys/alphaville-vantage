import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";
import { listPublishedByType } from "@/lib/editorial.functions";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const QO = queryOptions({
  queryKey: ["editorial", "bairro"],
  queryFn: () => listPublishedByType({ data: { type: "bairro" } }),
});

export const Route = createFileRoute("/bairros/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(QO),
  head: () => ({
    meta: [
      { title: "Bairros de Alphaville, Tamboré e região — S.A Imóveis Alphaville" },
      { name: "description", content: "Guia editorial dos bairros de Alphaville, Tamboré, Barueri e Santana de Parnaíba." },
      { property: "og:title", content: "Bairros da região de Alphaville" },
      { property: "og:url", content: `${SITE_URL}/bairros` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/bairros` }],
  }),
  component: BairrosPage,
  errorComponent: ({ error }) => (
    <SectionPage eyebrow="Erro" title="Não foi possível carregar" lead={error.message} breadcrumbs={[{ label: "Bairros" }]}><div /></SectionPage>
  ),
  notFoundComponent: () => <div />,
});

function BairrosPage() {
  const { data: items } = useSuspenseQuery(QO);
  return (
    <SectionPage
      eyebrow="Guia"
      title="Bairros da região"
      lead="Conheça em profundidade Alphaville, Tamboré, Barueri e Santana de Parnaíba — perfis, infraestrutura, mercado e estilo de vida."
      breadcrumbs={[{ label: "Bairros" }]}
    >
      {items.length === 0 ? (
        <ComingSoonGrid items={[
          { eyebrow: "Em breve", title: "Alphaville", lead: "Em construção." },
          { eyebrow: "Em breve", title: "Tamboré", lead: "Em construção." },
        ]} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
          {items.map((c) => (
            <Link key={c.id} to="/bairros/$slug" params={{ slug: c.slug }} className="group block border-t border-ink/10 pt-6">
              {c.featured_image && (
                <div className="aspect-[4/3] bg-ink/5 overflow-hidden mb-4">
                  <img src={c.featured_image} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
              )}
              <h3 className="font-serif text-2xl font-medium leading-snug mb-3 text-balance group-hover:underline">{c.title}</h3>
              {c.excerpt && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{c.excerpt}</p>}
            </Link>
          ))}
        </div>
      )}
    </SectionPage>
  );
}
