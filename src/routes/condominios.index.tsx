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

  const [sel, setSel] = useState("all");
  const [hood, setHood] = useState("all");

  const hoods = useMemo(
    () =>
      [...new Set(items.map((c) => c.related_neighborhood).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [items],
  );

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    [items],
  );

  const selectable = useMemo(
    () => sorted.filter((c) => hood === "all" || c.related_neighborhood === hood),
    [sorted, hood],
  );

  const filtered = useMemo(
    () => selectable.filter((c) => sel === "all" || c.id === sel),
    [selectable, sel],
  );

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
          {items.length > 0 && (
            <div className="border border-canvas/15 bg-canvas/[0.04] p-5 md:p-6 mb-12">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-canvas/50" />
                  <select
                    value={sel}
                    onChange={(e) => setSel(e.target.value)}
                    aria-label="Selecionar condomínio"
                    className="h-10 w-full border border-canvas/20 bg-transparent pl-9 pr-3 text-sm text-canvas [&>option]:text-ink"
                  >
                    <option value="all">Todos os condomínios</option>
                    {selectable.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                        {c.related_neighborhood ? ` — ${c.related_neighborhood}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <select
                  value={hood}
                  onChange={(e) => { setHood(e.target.value); setSel("all"); }}
                  aria-label="Filtrar por bairro"
                  className="h-10 border border-canvas/20 bg-transparent px-3 text-sm text-canvas [&>option]:text-ink"
                >
                  <option value="all">Todos os bairros</option>
                  {hoods.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-canvas/60">
                {filtered.length} {filtered.length === 1 ? "condomínio encontrado" : "condomínios encontrados"}
              </p>
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-canvas/70 text-sm">Novos dossiês de condomínios em breve.</p>
          ) : filtered.length === 0 ? (
            <p className="text-canvas/70 text-sm">Nenhum condomínio corresponde aos filtros.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filtered.map((c) => (
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
