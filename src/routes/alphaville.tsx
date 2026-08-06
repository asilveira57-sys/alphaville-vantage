import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, GraduationCap, Route as RouteIcon, UtensilsCrossed, Stethoscope, TrendingUp } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { PremiumCard } from "@/components/premium-card";
import { CleanPropertyCard } from "@/components/premium-cards/clean-property-card";
import { resolveImage } from "@/lib/image-fallbacks";
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
  const heroImg = resolveImage(null, { type: "region", region: "alphaville" });

  const topics: Array<{
    to: string;
    eyebrow: string;
    title: string;
    description: string;
    icon: ReactNode;
    fallback: { type: "region" | "condo" | "post"; seed: string };
  }> = [
    { to: "/condominios", eyebrow: "Residenciais", title: "Condomínios de Alphaville", description: "Dos icônicos Residenciais 1, 2 e 3 aos lançamentos verticais — perfis distintos de arquitetura, lazer e público.", icon: <Building2 className="h-5 w-5" strokeWidth={1.8} />, fallback: { type: "condo", seed: "alphaville-condominios" } },
    { to: "/escolas", eyebrow: "Educação", title: "Escolas e faculdades", description: "Algumas das principais escolas particulares do país — bilíngues, internacionais e tradicionais.", icon: <GraduationCap className="h-5 w-5" strokeWidth={1.8} />, fallback: { type: "post", seed: "alphaville-escolas" } },
    { to: "/guia-alphaville", eyebrow: "Mobilidade", title: "Acessos e deslocamento", description: "Ligação direta com Castelo Branco e Rodoanel, ciclovias internas e integração com o centro empresarial.", icon: <RouteIcon className="h-5 w-5" strokeWidth={1.8} />, fallback: { type: "region", seed: "alphaville-mobilidade" } },
    { to: "/restaurantes", eyebrow: "Gastronomia", title: "Restaurantes e lazer", description: "Calçadão, shoppings e dezenas de restaurantes consolidados. Polo de gastronomia autoral e redes premium.", icon: <UtensilsCrossed className="h-5 w-5" strokeWidth={1.8} />, fallback: { type: "post", seed: "alphaville-gastronomia" } },
    { to: "/guia-alphaville", eyebrow: "Saúde", title: "Hospitais e clínicas", description: "Referência regional em pronto-atendimento, diagnóstico por imagem e cirurgia eletiva.", icon: <Stethoscope className="h-5 w-5" strokeWidth={1.8} />, fallback: { type: "post", seed: "alphaville-saude" } },
    { to: "/mercado-imobiliario", eyebrow: "Mercado", title: "Mercado imobiliário", description: "Um dos metros quadrados mais valorizados da Grande São Paulo, com liquidez consistente em venda e locação.", icon: <TrendingUp className="h-5 w-5" strokeWidth={1.8} />, fallback: { type: "region", seed: "alphaville-mercado" } },
  ];

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-navy-deep text-canvas">
        <img
          src={heroImg}
          alt="Alphaville — vista aérea"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
          loading="eager"
          fetchPriority="high"
        />
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,14,28,0.55)_0%,rgba(8,14,28,0.75)_60%,rgba(8,14,28,0.95)_100%)]" />
        <div className="relative px-6 pt-16 md:pt-24 pb-20 md:pb-28">
          <div className="max-w-7xl mx-auto">
            <nav aria-label="Trilha" className="mb-8">
              <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-canvas/60">
                <li><Link to="/" className="hover:text-gold">Início</Link></li>
                <li className="flex items-center gap-2"><span aria-hidden>/</span><span className="text-gold">Alphaville</span></li>
              </ol>
            </nav>
            <p className="text-[10px] uppercase tracking-[0.25em] text-gold mb-6">Bairro · Barueri · São Paulo</p>
            <h1 className="font-serif text-4xl md:text-6xl font-medium leading-[1.05] tracking-tight text-balance max-w-[24ch] drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
              Alphaville: o primeiro grande complexo de condomínios fechados do Brasil
            </h1>
            <p className="mt-8 text-lg text-canvas/80 leading-relaxed max-w-[62ch] text-pretty">
              Concebido nos anos 1970 pela Construtora Albuquerque Takaoka, Alphaville inaugurou um novo
              padrão de viver no Brasil — segurança, áreas verdes preservadas, infraestrutura completa e
              uma cultura própria de bairro planejado.
            </p>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-2xl border-t border-white/15 pt-8">
              <Stat label="Imóveis ativos" value={total} />
              <Stat label="À venda" value={sale} />
              <Stat label="Para alugar" value={rent} />
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/imoveis"
                search={{ neighborhood: "Alphaville", purpose: "", type: "", city: "", condo: "", bedrooms: 0, parking: 0, priceMin: 0, priceMax: 0, areaMin: 0, sort: "recent", q: "" }}
                className="inline-flex items-center gap-2 bg-gold text-navy-deep px-6 py-3.5 text-xs font-bold uppercase tracking-widest hover:brightness-110 shadow-[0_10px_30px_-12px_rgba(203,161,53,0.6)] transition"
              >
                Ver imóveis em Alphaville
              </Link>
              <Link to="/condominios" className="inline-flex items-center gap-2 border border-canvas/30 text-canvas px-6 py-3.5 text-xs font-bold uppercase tracking-widest hover:bg-canvas/10 transition">
                Condomínios da região
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TOPICS — premium cards */}
      <section className="px-6 py-20 md:py-24 bg-canvas">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">O que faz de Alphaville, Alphaville</p>
              <h2 className="font-serif text-3xl md:text-4xl text-ink max-w-[22ch]">Explore os pilares do bairro</h2>
            </div>
            <Link to="/guia-alphaville" className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-ink">Guia completo →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {topics.map((t) => (
              <PremiumCard
                key={t.title}
                to={t.to as never}
                image={null}
                imageAlt={t.title}
                eyebrow={t.eyebrow}
                title={t.title}
                description={t.description}
                icon={t.icon}
                cta="Explorar"
                aspectRatio="tall"
                fallback={t.fallback}
              />
            ))}
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="px-6 py-20 md:py-24 bg-ink/[0.02] border-t border-ink/8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Selecionados pela redação</p>
                <h2 className="font-serif text-3xl md:text-4xl text-ink">Imóveis em Alphaville</h2>
              </div>
              <Link
                to="/imoveis"
                search={{ neighborhood: "Alphaville", purpose: "", type: "", city: "", condo: "", bedrooms: 0, parking: 0, priceMin: 0, priceMax: 0, areaMin: 0, sort: "recent", q: "" }}
                className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-ink"
              >
                Ver todos →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {featured.map((p: typeof featured[number]) => (
                <CleanPropertyCard
                  key={p.id}
                  slug={p.slug}
                  title={p.seo_title?.replace(/\s*\|\s*S\.A.*$/i, "") ?? p.title}
                  image={p.images[0] ?? null}
                  neighborhood="Alphaville"
                  region="alphaville"
                  propertyType={p.property_type}
                  priceSale={p.price_sale}
                  priceRent={p.price_rent}
                  bedrooms={p.bedrooms}
                  area={p.area_useful ?? p.area_built ?? p.area_total}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-serif text-3xl md:text-4xl text-gold">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-canvas/60 mt-1">{label}</div>
    </div>
  );
}
