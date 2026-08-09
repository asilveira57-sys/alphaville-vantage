import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { PremiumCondoCard } from "@/components/premium-cards/condo-card";
import { listPublishedByType } from "@/lib/editorial.functions";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const condosQO = queryOptions({
  queryKey: ["editorial", "condominio"],
  queryFn: () => listPublishedByType({ data: { type: "condominio" } }),
});

export const Route = createFileRoute("/condominios/")({
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
    <SiteLayout>
      <div className="max-w-2xl mx-auto px-6 py-24 text-sm text-red-600">{error.message}</div>
    </SiteLayout>
  ),
  notFoundComponent: () => <div />,
});

function CondosPage() {
  const { data: items } = useSuspenseQuery(condosQO);

  return (
    <SiteLayout>
      <section className="bg-navy-deep text-canvas px-6 pt-20 pb-16">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">Catálogo</p>
          <h1 className="font-serif text-4xl md:text-6xl font-medium leading-[1.05] max-w-[24ch] text-balance">
            Condomínios da região de Alphaville
          </h1>
          <p className="mt-6 text-base md:text-lg text-canvas/70 max-w-[62ch] leading-relaxed">
            Um guia editorial dos residenciais de Alphaville, Tamboré e Santana de Parnaíba —
            história, perfil, infraestrutura e dinâmica de valorização.
          </p>
        </div>
      </section>

      <section className="bg-navy-deep px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {items.length === 0 ? (
            <p className="text-canvas/70 text-sm">Novos dossiês de condomínios em breve.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {items.map((c) => (
                <PremiumCondoCard
                  key={c.id}
                  slug={c.slug}
                  title={c.title}
                  image={c.featured_image}
                  neighborhood={c.related_neighborhood}
                  excerpt={c.excerpt}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <InstitutionalBlock />
    </SiteLayout>
  );
}
