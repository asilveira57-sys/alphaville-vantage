import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://alphaville-vantage.lovable.app";

async function fetchAlphavilleSnapshot() {
  const [{ count: total }, { count: sale }, { count: rent }, { data: featured }] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "active").eq("neighborhood", "Alphaville"),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "active").eq("neighborhood", "Alphaville").in("purpose", ["sale", "both"]),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "active").eq("neighborhood", "Alphaville").in("purpose", ["rent", "both"]),
    supabase
      .from("properties")
      .select("id,slug,title,seo_title,property_type,bedrooms,area_useful,area_built,area_total,price_sale,price_rent,images,purpose")
      .eq("status", "active")
      .eq("neighborhood", "Alphaville")
      .order("last_seen_at", { ascending: false })
      .limit(6),
  ]);
  return {
    total: total ?? 0,
    sale: sale ?? 0,
    rent: rent ?? 0,
    featured: (featured ?? []).map((p) => ({
      ...p,
      images: Array.isArray(p.images) ? (p.images as string[]).filter((u) => /^https?:\/\//.test(u) && !/(logo|favicon|whats|placeholder)/i.test(u)) : [],
    })),
  };
}

const fmtPrice = (n: number | null) =>
  n == null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(n));

export const Route = createFileRoute("/alphaville")({
  loader: fetchAlphavilleSnapshot,
  head: () => ({
    meta: [
      { title: "Alphaville — bairro, condomínios e imóveis | S.A Imóveis" },
      { name: "description", content: "Tudo sobre o bairro de Alphaville: histórico, condomínios, qualidade de vida e imóveis à venda e para locação." },
      { property: "og:title", content: "Alphaville — bairro, condomínios e imóveis" },
      { property: "og:description", content: "O bairro de Alphaville em profundidade: condomínios, perfil, mercado e imóveis." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/alphaville` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/alphaville` }],
  }),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground">Não foi possível carregar Alphaville: {error.message}</p>
      </section>
    </SiteLayout>
  ),
  component: AlphavillePage,
});

function AlphavillePage() {
  const { total, sale, rent, featured } = Route.useLoaderData();

  return (
    <SiteLayout>
      <section className="px-6 pt-16 md:pt-24 pb-12 border-b border-ink/8">
        <div className="max-w-7xl mx-auto">
          <nav aria-label="Trilha" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <li><Link to="/" className="hover:text-ink">Início</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><span className="text-ink">Alphaville</span></li>
            </ol>
          </nav>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">Bairro · Barueri · São Paulo</p>
          <h1 className="font-serif text-5xl md:text-6xl font-medium leading-[1.05] tracking-tight text-balance max-w-[22ch]">
            Alphaville: o primeiro grande complexo de condomínios fechados do Brasil
          </h1>
          <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-[60ch] text-pretty">
            Concebido nos anos 1970 pela Construtora Albuquerque Takaoka, Alphaville inaugurou um novo
            padrão de viver no Brasil — segurança, áreas verdes preservadas, infraestrutura completa e
            uma cultura própria de bairro planejado. Hoje reúne dezenas de residenciais, escolas
            referenciadas, um centro empresarial relevante e uma das maiores concentrações de
            consumo de alto padrão do estado.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6 max-w-2xl border-t border-ink/10 pt-8">
            <Stat label="Imóveis ativos" value={total} />
            <Stat label="À venda" value={sale} />
            <Stat label="Para alugar" value={rent} />
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/imoveis"
              search={{ neighborhood: "Alphaville", purpose: "", type: "", city: "", condo: "", bedrooms: 0, parking: 0, priceMin: 0, priceMax: 0, areaMin: 0, sort: "recent", q: "" }}
              className="inline-flex items-center gap-2 bg-brand-yellow text-brand-dark px-5 py-3 text-xs font-bold uppercase tracking-widest hover:brightness-95 transition"
            >
              Ver imóveis em Alphaville
            </Link>
            <Link to="/condominios" className="inline-flex items-center gap-2 border border-ink/20 px-5 py-3 text-xs font-bold uppercase tracking-widest hover:bg-ink/5 transition">
              Condomínios da região
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 border-b border-ink/8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          <Block title="Condomínios" lead="Dos icônicos Residenciais 1, 2 e 3 aos lançamentos verticais, Alphaville organiza a vida em residenciais fechados com perfis distintos de público, lazer e arquitetura." />
          <Block title="Educação" lead="Concentra algumas das principais escolas particulares do país — bilíngues, internacionais e tradicionais — atendendo da educação infantil ao ensino médio." />
          <Block title="Mobilidade" lead="Acesso direto à Castelo Branco e ao Rodoanel, com integração crescente ao centro empresarial. Boa malha de ciclovias internas aos condomínios." />
          <Block title="Gastronomia & lazer" lead="Calçadão, shoppings e dezenas de restaurantes consolidados. Polo de gastronomia autoral, redes premium e clubes esportivos." />
          <Block title="Saúde" lead="Hospitais e clínicas de referência regional, com serviços completos de pronto-atendimento, diagnóstico e cirurgia eletiva." />
          <Block title="Mercado" lead="Um dos metros quadrados mais valorizados da Grande São Paulo. Liquidez consistente em venda e locação para alto padrão residencial e comercial." />
        </div>
      </section>

      {featured.length > 0 && (
        <section className="px-6 py-20 border-b border-ink/8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-baseline justify-between mb-10">
              <h2 className="font-serif text-3xl md:text-4xl">Imóveis em Alphaville</h2>
              <Link
                to="/imoveis"
                search={{ neighborhood: "Alphaville", purpose: "", type: "", city: "", condo: "", bedrooms: 0, parking: 0, priceMin: 0, priceMax: 0, areaMin: 0, sort: "recent", q: "" }}
                className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-ink"
              >
                Ver todos →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {featured.map((p) => (
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
          </div>
        </section>
      )}

      <InstitutionalBlock />
    </SiteLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-serif text-3xl text-ink">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Block({ title, lead }: { title: string; lead: string }) {
  return (
    <article className="border-t border-ink/10 pt-6">
      <h3 className="font-serif text-2xl mb-3">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{lead}</p>
    </article>
  );
}
