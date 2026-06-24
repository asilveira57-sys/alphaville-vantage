import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const isUsableImg = (u: string) =>
  /^https?:\/\//.test(u) && !/(logo|favicon|whats|placeholder|topo_)/i.test(u);

async function fetchCondo(slug: string) {
  const { data: condo, error } = await supabase
    .from("condominiums")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!condo) throw notFound();

  const { data: properties } = await supabase
    .from("properties")
    .select("id,slug,title,seo_title,property_type,purpose,bedrooms,area_useful,area_built,area_total,price_sale,price_rent,images")
    .eq("status", "active")
    .eq("condominium_id", condo.id)
    .order("last_seen_at", { ascending: false });

  return {
    condo,
    properties: (properties ?? []).map((p) => ({
      ...p,
      images: Array.isArray(p.images) ? (p.images as string[]).filter(isUsableImg) : [],
    })),
  };
}

const fmtPrice = (n: number | null) =>
  n == null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(n));

export const Route = createFileRoute("/condominio/$slug")({
  loader: ({ params }) => fetchCondo(params.slug),
  head: ({ params, loaderData }) => {
    const c = loaderData?.condo;
    const url = `${SITE_URL}/condominio/${params.slug}`;
    const title = c ? `${c.name} — Condomínio em ${c.region ?? "Alphaville"} | S.A Imóveis` : "Condomínio";
    const description = c?.description?.slice(0, 160) ?? `Conheça o condomínio ${c?.name ?? ""}: perfil, infraestrutura e imóveis disponíveis.`;
    const image = c?.cover_image_url ?? undefined;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground">Não foi possível carregar este condomínio: {error.message}</p>
        <Link to="/condominios" className="mt-6 inline-block text-sm underline">Voltar à lista</Link>
      </section>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl mb-4">Condomínio não encontrado</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Ainda não publicamos o dossiê deste residencial. Volte em breve ou explore a lista completa.
        </p>
        <Link to="/condominios" className="text-sm underline">Ver condomínios</Link>
      </section>
    </SiteLayout>
  ),
  component: CondoPage,
});

function CondoPage() {
  const { condo, properties } = Route.useLoaderData();

  return (
    <SiteLayout>
      <section className="px-6 pt-16 md:pt-24 pb-12 border-b border-ink/8">
        <div className="max-w-7xl mx-auto">
          <nav aria-label="Trilha" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <li><Link to="/" className="hover:text-ink">Início</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><Link to="/condominios" className="hover:text-ink">Condomínios</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><span className="text-ink">{condo.name}</span></li>
            </ol>
          </nav>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">
            Condomínio {condo.region ? `· ${condo.region}` : ""}
          </p>
          <h1 className="font-serif text-5xl md:text-6xl font-medium leading-[1.05] tracking-tight text-balance max-w-[22ch]">{condo.name}</h1>
          {condo.description && (
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-[60ch] text-pretty whitespace-pre-line">{condo.description}</p>
          )}

          {(condo.units_count || condo.year_built) && (
            <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-6 max-w-2xl border-t border-ink/10 pt-8">
              {condo.units_count != null && <Stat label="Unidades" value={String(condo.units_count)} />}
              {condo.year_built != null && <Stat label="Ano de entrega" value={String(condo.year_built)} />}
              <Stat label="Imóveis ativos" value={String(properties.length)} />
            </div>
          )}
        </div>
      </section>

      {condo.cover_image_url && (
        <section className="px-6 py-12 bg-ink/[0.02]">
          <div className="max-w-6xl mx-auto">
            <img src={condo.cover_image_url} alt={condo.name} className="w-full h-auto" loading="lazy" />
          </div>
        </section>
      )}

      {condo.amenities && condo.amenities.length > 0 && (
        <section className="px-6 py-16 border-t border-ink/8">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-3xl mb-8">Infraestrutura e lazer</h2>
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-3 text-sm text-muted-foreground">
              {(condo.amenities as string[]).map((a: string, i: number) => (
                <li key={i} className="border-t border-ink/10 pt-3">{a}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="px-6 py-20 border-t border-ink/8">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl mb-10">Imóveis neste condomínio</h2>
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No momento não temos imóveis ativos neste condomínio.{" "}
              <Link to="/imoveis" className="underline">Ver outros imóveis</Link>.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {properties.map((p: typeof properties[number]) => (
                <Link key={p.id} to="/imoveis/$slug" params={{ slug: p.slug }} className="group block">
                  <div className="aspect-[4/3] bg-ink/5 overflow-hidden mb-4">
                    {p.images[0] && <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />}
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{p.property_type ?? "Imóvel"}</p>
                  <h3 className="font-serif text-lg leading-snug mb-2 text-balance group-hover:underline">{p.seo_title?.replace(/\s*\|\s*S\.A.*$/i, "") ?? p.title}</h3>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4">
                    {p.price_sale && <span>{fmtPrice(p.price_sale)}</span>}
                    {p.price_rent && <span>{fmtPrice(p.price_rent)}/mês</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <InstitutionalBlock />
    </SiteLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-serif text-3xl text-ink">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
