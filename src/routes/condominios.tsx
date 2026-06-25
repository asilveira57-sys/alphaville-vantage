import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";
import { listPublishedByType } from "@/lib/editorial.functions";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const condosQO = queryOptions({
  queryKey: ["editorial", "condominio"],
  queryFn: () => listPublishedByType({ data: { type: "condominio" } }),
});

export const Route = createFileRoute("/condominios")({
  loader: ({ context }) => context.queryClient.ensureQueryData(condosQO),
  head: () => ({
    meta: [
      { title: "Condomínios de Alphaville e Tamboré — S.A Imóveis Alphaville" },
      { name: "description", content: "Conheça todos os condomínios de Alphaville e Tamboré: residenciais, perfis, infraestrutura, valorização e curiosidades." },
      { property: "og:title", content: "Condomínios de Alphaville e Tamboré" },
      { property: "og:description", content: "Dossiê de todos os condomínios da região." },
      { property: "og:url", content: `${SITE_URL}/condominios` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/condominios` }],
  }),
  component: CondosPage,
  errorComponent: ({ error }) => (
    <SectionPage eyebrow="Erro" title="Não foi possível carregar" lead={error.message} breadcrumbs={[{ label: "Condomínios" }]}><div /></SectionPage>
  ),
  notFoundComponent: () => <div />,
});

function CondosPage() {
  const { data: items } = useSuspenseQuery(condosQO);

  return (
    <SectionPage
      eyebrow="Catálogo"
      title="Condomínios da região"
      lead="Um guia editorial dos residenciais de Alphaville, Tamboré e Santana de Parnaíba. Cada condomínio com sua história, perfil, infraestrutura e dinâmica de valorização."
      breadcrumbs={[{ label: "Condomínios" }]}
    >
      {items.length === 0 ? (
        <ComingSoonGrid
          items={[
            { eyebrow: "Histórico", title: "Residencial 1", lead: "O primeiro condomínio de Alphaville." },
            { eyebrow: "Clássico", title: "Residencial 10", lead: "O maior em área verde por unidade." },
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
          {items.map((c) => (
            <Link key={c.id} to="/condominios/$slug" params={{ slug: c.slug }} className="group block border-t border-ink/10 pt-6">
              {c.featured_image && (
                <div className="aspect-[4/3] bg-ink/5 overflow-hidden mb-4">
                  <img src={c.featured_image} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
              )}
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{c.related_neighborhood ?? "Condomínio"}</p>
              <h3 className="font-serif text-2xl font-medium leading-snug mb-3 text-balance group-hover:underline">{c.title}</h3>
              {c.excerpt && (
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty line-clamp-3">{c.excerpt}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </SectionPage>
  );
}
