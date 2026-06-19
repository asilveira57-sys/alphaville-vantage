import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { supabase } from "@/integrations/supabase/client";

type PropertyRow = {
  id: string;
  slug: string;
  title: string;
  purpose: "rent" | "sale" | "both" | null;
  property_type: string | null;
  region: string | null;
  bedrooms: number | null;
  suites: number | null;
  parking: number | null;
  area_useful: number | null;
  price_sale: number | null;
  price_rent: number | null;
  images: string[];
};

const isUsableImg = (u: string) =>
  /^https?:\/\//.test(u) &&
  !/(logo|favicon|whats|placeholder|topo_contato)/i.test(u);

async function fetchProperties(): Promise<PropertyRow[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id,slug,title,purpose,property_type,region,bedrooms,suites,parking,area_useful,price_sale,price_rent,images")
    .eq("status", "active")
    .order("last_seen_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    ...p,
    images: Array.isArray(p.images) ? (p.images as string[]).filter(isUsableImg) : [],
  })) as PropertyRow[];
}

export const Route = createFileRoute("/imoveis/")({
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

const fmtPrice = (n: number | null) =>
  n == null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

function PriceTag({ p }: { p: PropertyRow }) {
  const sale = fmtPrice(p.price_sale);
  const rent = fmtPrice(p.price_rent);
  if (!sale && !rent) return <span className="text-muted-foreground text-xs">Consulte</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {sale && <span className="font-serif text-lg">{sale}</span>}
      {rent && <span className="text-xs text-muted-foreground">{rent}/mês</span>}
    </div>
  );
}

function PropertyCard({ p }: { p: PropertyRow }) {
  const img = p.images[0];
  const specs = [
    p.bedrooms && `${p.bedrooms} dorm.`,
    p.suites && `${p.suites} suítes`,
    p.parking && `${p.parking} vagas`,
    p.area_useful && `${Number(p.area_useful)}m²`,
  ].filter(Boolean);
  return (
    <Link
      to="/imoveis/$slug"
      params={{ slug: p.slug }}
      className="group block border-t border-ink/10 pt-6"
    >
      <div className="aspect-[4/3] bg-ink/5 overflow-hidden mb-5">
        {img ? (
          <img
            src={img}
            alt={p.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-widest text-muted-foreground">
            Sem imagem
          </div>
        )}
      </div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
        {p.property_type ?? "Imóvel"} {p.purpose === "rent" ? "· Locação" : p.purpose === "sale" ? "· Venda" : p.purpose === "both" ? "· Venda/Locação" : ""}
      </p>
      <h3 className="font-serif text-xl leading-snug mb-3 text-balance line-clamp-2">
        {p.title}
      </h3>
      {specs.length > 0 && (
        <p className="text-xs text-muted-foreground mb-3">{specs.join(" · ")}</p>
      )}
      <PriceTag p={p} />
    </Link>
  );
}

function ImoveisPage() {
  const properties = Route.useLoaderData();
  const total = properties.length;

  return (
    <SiteLayout>
      <section className="px-6 pt-16 md:pt-24 pb-12 border-b border-ink/8">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">
            Portfólio
          </p>
          <h1 className="font-serif text-5xl md:text-6xl font-medium leading-[1.05] tracking-tight text-balance max-w-[22ch]">
            Imóveis selecionados
          </h1>
          <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-[60ch] text-pretty">
            {total} {total === 1 ? "imóvel disponível" : "imóveis disponíveis"} em Alphaville, Tamboré, Barueri e Santana de Parnaíba.
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto">
          {total === 0 ? (
            <p className="text-muted-foreground">Nenhum imóvel ativo no momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-16">
              {properties.map((p: PropertyRow) => <PropertyCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </section>

      <InstitutionalBlock />
    </SiteLayout>
  );
}
