import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { supabase } from "@/integrations/supabase/client";
import { PropertyFilters, type FilterOptions, type FilterState } from "@/components/property-filters";
import { PremiumPropertyCard } from "@/components/premium-cards/property-card";
import { interpretQuery } from "@/lib/property-search";

type PropertyRow = {
  id: string;
  slug: string;
  title: string;
  internal_code: string | null;
  purpose: "rent" | "sale" | "both" | null;
  property_type: string | null;
  city: string | null;
  neighborhood: string | null;
  condominium_name: string | null;
  region: string | null;
  bedrooms: number | null;
  suites: number | null;
  parking: number | null;
  parking_covered: number | null;
  parking_uncovered: number | null;
  area_useful: number | null;
  area_built: number | null;
  area_total: number | null;
  price_sale: number | null;
  price_rent: number | null;
  last_seen_at: string | null;
  seo_title: string | null;
  images: string[];
};

const isUsableImg = (u: string) =>
  /^https?:\/\//.test(u) &&
  !/(logo|favicon|whats|placeholder|topo_contato)/i.test(u);

const WHATSAPP_NUMBER = "5511995515053";

async function fetchProperties(): Promise<{ items: PropertyRow[]; options: FilterOptions }> {
  const data = await fetchAllRows<Record<string, unknown>>((f, t) =>
    supabase
      .from("properties")
      .select(
        "id,slug,title,internal_code,purpose,property_type,city,neighborhood,condominium_name,region,bedrooms,suites,parking,parking_covered,parking_uncovered,area_useful,area_built,area_total,price_sale,price_rent,last_seen_at,seo_title,images",
      )
      .eq("status", "active")
      .order("last_seen_at", { ascending: false })
      .range(f, t),
  );
  const items = data.map((p) => ({
    ...p,
    images: Array.isArray((p as { images?: unknown }).images)
      ? ((p as { images: string[] }).images).filter(isUsableImg)
      : [],
  })) as unknown as PropertyRow[];

  const uniq = (arr: (string | null | undefined)[]) =>
    Array.from(new Set(arr.filter((x): x is string => !!x && x.trim() !== ""))).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const options: FilterOptions = {
    types: uniq(items.map((p) => p.property_type)),
    cities: uniq(items.map((p) => p.city)),
    neighborhoods: uniq(items.map((p) => p.neighborhood)),
    condos: uniq(items.map((p) => p.condominium_name)),
    priceMax: Math.max(
      0,
      ...items.map((p) => Math.max(p.price_sale ?? 0, p.price_rent ?? 0)),
    ),
    isRent: items.some((p) => p.purpose === "rent") && !items.some((p) => p.purpose === "sale"),
  };

  return { items, options };
}

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

const PAGE_SIZE = 15;

export const Route = createFileRoute("/imoveis/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Imóveis em Alphaville — S.A Imóveis Alphaville" },
      { name: "description", content: "Catálogo de imóveis para venda e locação em Alphaville, Tamboré, Barueri e Santana de Parnaíba." },
      { property: "og:title", content: "Imóveis em Alphaville" },
      { property: "og:description", content: "Portfólio S.A: casas, apartamentos e lançamentos." },
    ],
    links: [{ rel: "canonical", href: "/imoveis" }],
  }),
  loader: () => fetchProperties(),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-7xl mx-auto">
        <p className="text-sm text-muted-foreground">Não foi possível carregar os imóveis: {error.message}</p>
      </section>
    </SiteLayout>
  ),
  component: ImoveisPage,
});

function PropertyCard({ p }: { p: PropertyRow }) {
  const img = p.images[0];
  const totalParking = (p.parking_covered ?? 0) + (p.parking_uncovered ?? 0) || p.parking || 0;
  const area = p.area_useful ?? p.area_built ?? p.area_total;
  return (
    <PremiumPropertyCard
      slug={p.slug}
      title={p.title}
      image={img}
      region={p.region ?? p.city}
      neighborhood={p.neighborhood}
      city={p.city}
      propertyType={p.property_type}
      priceSale={p.price_sale}
      priceRent={p.price_rent}
      bedrooms={p.bedrooms}
      suites={p.suites}
      parking={totalParking || null}
      area={area}
      internalCode={p.internal_code}
    />
  );
}


function applyFilters(items: PropertyRow[], s: FilterState): PropertyRow[] {
  const norm = (v: string | null | undefined) =>
    (v ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const fuzzyEq = (a: string | null | undefined, b: string) => {
    const na = norm(a);
    const nb = norm(b);
    if (!nb) return true;
    if (!na) return false;
    return na === nb || na.includes(nb) || nb.includes(na);
  };
  let out = items;
  if (s.purpose) {
    out = out.filter((p) => p.purpose === s.purpose || p.purpose === "both" || (s.purpose === "both"));
  }
  if (s.type) out = out.filter((p) => fuzzyEq(p.property_type, s.type));
  if (s.city) out = out.filter((p) => fuzzyEq(p.city, s.city));
  if (s.neighborhood) out = out.filter((p) => fuzzyEq(p.neighborhood, s.neighborhood));
  if (s.condo) out = out.filter((p) => fuzzyEq(p.condominium_name, s.condo));
  if (s.bedrooms) out = out.filter((p) => (p.bedrooms ?? 0) >= s.bedrooms);
  if (s.parking) {
    out = out.filter((p) => {
      const t = (p.parking_covered ?? 0) + (p.parking_uncovered ?? 0) || p.parking || 0;
      return t >= s.parking;
    });
  }
  if (s.priceMin || s.priceMax) {
    out = out.filter((p) => {
      const candidates: number[] = [];
      if (s.purpose === "sale") { if (p.price_sale) candidates.push(p.price_sale); }
      else if (s.purpose === "rent") { if (p.price_rent) candidates.push(p.price_rent); }
      else {
        if (p.price_sale) candidates.push(p.price_sale);
        if (p.price_rent) candidates.push(p.price_rent);
      }
      if (!candidates.length) return false;
      const v = Math.min(...candidates);
      if (s.priceMin && v < s.priceMin) return false;
      if (s.priceMax && v > s.priceMax) return false;
      return true;
    });
  }
  if (s.areaMin) {
    out = out.filter((p) => {
      const a = Math.max(p.area_useful ?? 0, p.area_built ?? 0, p.area_total ?? 0);
      return a >= s.areaMin;
    });
  }
  if (s.q) {
    const normalize = (str: string) =>
      str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Sinônimos de logradouro — colapsam para um marcador ignorado
    const STREET_SYNONYMS: Record<string, string> = {
      r: "__log__", rua: "__log__",
      av: "__log__", avenida: "__log__", ave: "__log__",
      al: "__log__", alameda: "__log__",
      tv: "__log__", travessa: "__log__",
      pc: "__log__", pca: "__log__", praca: "__log__",
      rod: "__log__", rodovia: "__log__",
      estr: "__log__", estrada: "__log__",
      lgo: "__log__", largo: "__log__",
      via: "__log__",
    };
    const STOP = new Set(["de", "da", "do", "das", "dos", "e"]);

    const tokenize = (str: string) =>
      normalize(str)
        .split(" ")
        .map((t) => STREET_SYNONYMS[t] ?? t)
        .filter((t) => t && !STOP.has(t) && t !== "__log__");

    const queryTokens = tokenize(s.q);

    if (queryTokens.length > 0) {
      out = out.filter((p) => {
        const haystack = tokenize(
          [p.title, p.condominium_name, p.neighborhood, p.seo_title, p.city, p.region]
            .filter(Boolean)
            .join(" "),
        );
        // Cada token da query precisa casar (substring bidirecional) com algum token do haystack
        return queryTokens.every((qt) =>
          haystack.some((ht) => ht.includes(qt) || qt.includes(ht)),
        );
      });
    }
  }
  const sorted = [...out];
  if (s.sort === "price_asc") {
    sorted.sort((a, b) => (a.price_sale ?? a.price_rent ?? Infinity) - (b.price_sale ?? b.price_rent ?? Infinity));
  } else if (s.sort === "price_desc") {
    sorted.sort((a, b) => (b.price_sale ?? b.price_rent ?? 0) - (a.price_sale ?? a.price_rent ?? 0));
  } else if (s.sort === "area_desc") {
    sorted.sort((a, b) => {
      const ax = Math.max(a.area_useful ?? 0, a.area_built ?? 0, a.area_total ?? 0);
      const bx = Math.max(b.area_useful ?? 0, b.area_built ?? 0, b.area_total ?? 0);
      return bx - ax;
    });
  } else {
    sorted.sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""));
  }
  return sorted;
}

function ImoveisPage() {
  const { items, options } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  // Aplica o motor central de interpretação sobre a frase digitada em q,
  // preenchendo apenas os filtros que o usuário ainda não escolheu manualmente.
  const effectiveSearch = useMemo<FilterState>(() => {
    if (!search.q) return search;
    const parsed = interpretQuery(search.q);
    return {
      ...search,
      purpose: search.purpose || parsed.purpose || "",
      type: search.type || parsed.type || "",
      city: search.city || parsed.city || "",
      neighborhood: search.neighborhood || parsed.neighborhood || "",
      bedrooms: search.bedrooms || parsed.bedrooms || 0,
      parking: search.parking || parsed.parking || 0,
      priceMax: search.priceMax || parsed.priceMax || 0,
    };
  }, [search]);

  const filtered = useMemo(() => applyFilters(items, effectiveSearch), [items, effectiveSearch]);
  const total = items.length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, search.page || 1), totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  const goToPage = (p: number) => {
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, page: p }),
      resetScroll: false,
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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

      <PropertyFilters options={options} state={search} filteredCount={filtered.length} totalCount={total} />

      <section className="px-6 py-12 md:py-16">
        <div className="max-w-7xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-ink/15">
              <p className="font-serif text-2xl text-ink mb-2">Nenhum imóvel encontrado</p>
              <p className="text-sm text-muted-foreground mb-6">Tente remover algum filtro para ver mais opções.</p>
              <Link to="/imoveis" search={{ purpose: "", type: "", city: "", neighborhood: "", condo: "", bedrooms: 0, parking: 0, priceMin: 0, priceMax: 0, areaMin: 0, sort: "recent", q: "", page: 1 }} className="inline-block bg-brand-yellow text-brand-dark px-5 py-3 text-xs font-bold uppercase tracking-widest">
                Limpar filtros
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {pageItems.map((p) => <PropertyCard key={p.id} p={p} />)}
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

