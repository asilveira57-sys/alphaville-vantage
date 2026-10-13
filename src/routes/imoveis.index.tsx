import { createFileRoute, Link, stripSearchParams } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { PropertyFilters, type FilterOptions } from "@/components/property-filters";
import { CleanPropertyCard } from "@/components/premium-cards/clean-property-card";
import { SaveSearchLead, type PdfProperty } from "@/components/save-search-lead";
import { searchProperties, getSearchFacets, PAGE_SIZE, type SearchCard } from "@/lib/property-search.functions";
import { effectiveSearch, IMOVEIS_DEFAULTS } from "@/lib/property-query";
import { SITE_URL } from "@/lib/site";

const searchSchema = z.object({
  purpose: fallback(z.string(), "").default(""),
  type: fallback(z.string(), "").default(""),
  city: fallback(z.string(), "").default(""),
  neighborhood: fallback(z.string(), "").default(""),
  condo: fallback(z.string(), "").default(""),
  bedrooms: fallback(z.number(), 0).default(0),
  parking: fallback(z.number(), 0).default(0),
  priceMin: fallback(z.number(), 0).default(0),
  priceMax: fallback(z.number(), 0).default(0),
  areaMin: fallback(z.number(), 0).default(0),
  sort: fallback(z.enum(["recent", "price_asc", "price_desc", "area_desc"]), "recent").default("recent"),
  q: fallback(z.string(), "").default(""),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/imoveis/")({
  validateSearch: zodValidator(searchSchema),
  // Parâmetros com valor padrão ficam fora da URL (/imoveis limpo, sem redirecionar).
  search: { middlewares: [stripSearchParams(IMOVEIS_DEFAULTS as never)] },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [result, facets] = await Promise.all([
      searchProperties({ data: { ...deps, page: Math.max(1, deps.page || 1) } }),
      getSearchFacets(),
    ]);
    return { ...result, facets };
  },
  head: () => ({
    meta: [
      { title: "Imóveis em Alphaville — S.A Imóveis Alphaville" },
      { name: "description", content: "Catálogo de imóveis para venda e locação em Alphaville, Tamboré, Barueri e Santana de Parnaíba." },
      { property: "og:title", content: "Imóveis em Alphaville" },
      { property: "og:description", content: "Portfólio S.A: casas, apartamentos e lançamentos." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/imoveis` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/imoveis` }],
  }),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-7xl mx-auto">
        <p className="text-sm text-muted-foreground">Não foi possível carregar os imóveis: {(error as Error).message}</p>
      </section>
    </SiteLayout>
  ),
  component: ImoveisPage,
});

function PropertyCard({ p, eager }: { p: SearchCard; eager?: boolean }) {
  const card = p.card_image_url;
  return (
    <CleanPropertyCard
      slug={p.slug}
      title={p.title}
      image={card ?? p.image}
      imageSrcSet={card ? `${card} 600w, ${card.replace(/-600\.webp$/, "-1200.webp")} 1200w` : null}
      eager={eager}
      region={p.region ?? p.city}
      neighborhood={p.neighborhood}
      city={p.city}
      propertyType={p.property_type}
      priceSale={p.price_sale}
      priceRent={p.price_rent}
      bedrooms={p.bedrooms}
      parking={p.parking_total}
      area={p.area}
      internalCode={p.internal_code}
    />
  );
}

function ImoveisPage() {
  const { items, total: filteredCount, facets } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const options: FilterOptions = facets;
  const total = facets.total;

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, search.page || 1), totalPages);

  const goToPage = (p: number) => {
    navigate({ search: (prev) => ({ ...prev, page: p }), resetScroll: false });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // PDF: busca até 30 imóveis da pesquisa só quando o visitante pede.
  const loadPdfItems = async (): Promise<PdfProperty[]> => {
    const r = await searchProperties({ data: { ...search, page: 1, limit: 30 } });
    return r.items;
  };

  return (
    <SiteLayout>
      <section className="px-6 pt-12 md:pt-16 pb-8 border-b border-ink/8">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">
            Portfólio
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium leading-[1.05] tracking-tight text-balance max-w-[22ch]">
            Buscar imóveis
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-[60ch]">
            {total} {total === 1 ? "imóvel disponível" : "imóveis disponíveis"} em Alphaville, Tamboré, Barueri e Santana de Parnaíba.
          </p>
        </div>
      </section>

      <PropertyFilters options={options} state={search} filteredCount={filteredCount} totalCount={total} />

      {filteredCount > 0 && (
        <section className="px-6 pt-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-ink/10 bg-background p-4">
            <p className="text-sm text-muted-foreground">
              Gostou desta seleção? Salve os <strong className="text-ink">{filteredCount} imóveis</strong> em PDF e envie para você.
            </p>
            <SaveSearchLead loadItems={loadPdfItems} total={filteredCount} query={search.q || ""} filters={effectiveSearch(search) as unknown as Record<string, unknown>} />
          </div>
        </section>
      )}

      <section className="px-6 py-12 md:py-16">
        <div className="max-w-7xl mx-auto">
          {filteredCount === 0 ? (
            <div className="text-center py-16 border border-dashed border-ink/15">
              <p className="font-serif text-2xl text-ink mb-2">Nenhum imóvel encontrado</p>
              <p className="text-sm text-muted-foreground mb-6">Tente remover algum filtro para ver mais opções.</p>
              <Link to="/imoveis" search={IMOVEIS_DEFAULTS as never} className="inline-block bg-brand-yellow text-brand-dark px-5 py-3 text-xs font-bold uppercase tracking-widest">
                Limpar filtros
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {items.map((p, i) => <PropertyCard key={p.id} p={p} eager={i === 0} />)}
              </div>
              {totalPages > 1 && (
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
              )}
            </>
          )}
        </div>
      </section>

      <InstitutionalBlock />
    </SiteLayout>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) {
  const pages: (number | "…")[] = [];
  const push = (v: number | "…") => pages.push(v);
  const window_ = 1;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - window_ && i <= currentPage + window_)
    ) {
      push(i);
    } else if (pages[pages.length - 1] !== "…") {
      push("…");
    }
  }

  return (
    <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Paginação">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-xs font-bold uppercase tracking-widest border border-ink/15 text-ink disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink hover:text-background transition-colors"
      >
        Anterior
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === currentPage ? "page" : undefined}
            className={
              p === currentPage
                ? "min-w-[40px] px-3 py-2 text-xs font-bold bg-brand-yellow text-brand-dark"
                : "min-w-[40px] px-3 py-2 text-xs font-medium border border-ink/15 text-ink hover:bg-ink hover:text-background transition-colors"
            }
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-xs font-bold uppercase tracking-widest border border-ink/15 text-ink disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ink hover:text-background transition-colors"
      >
        Próxima
      </button>
    </nav>
  );
}

