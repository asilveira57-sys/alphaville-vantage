import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { supabase } from "@/integrations/supabase/client";
import { PremiumPostCard } from "@/components/premium-cards/post-card";
import { PremiumPropertyCard } from "@/components/premium-cards/property-card";
import { PremiumRegionCard } from "@/components/premium-cards/region-card";
import { interpretQuery, toImoveisSearchParams } from "@/lib/property-search";
import { GoogleReviewsSection } from "@/components/google-reviews";
import { NewsletterForm } from "@/components/newsletter-form";
import { RadarSection } from "@/components/radar/radar-section";


import heroImg from "@/assets/hero-architecture.jpg";
import alphavilleImg from "@/assets/region-alphaville.jpg";
import tamboreImg from "@/assets/region-tambore.jpg";
import barueriImg from "@/assets/region-barueri.jpg";
import santanaImg from "@/assets/region-santana.jpg";
import interiorImg from "@/assets/article-interior.jpg";
import gardenImg from "@/assets/article-garden.jpg";
import clubhouseImg from "@/assets/article-clubhouse.jpg";

type FeaturedProperty = {
  slug: string;
  title: string;
  internal_code: string | null;
  price_sale: number | null;
  price_rent: number | null;
  image: string | null;
  neighborhood: string | null;
  city: string | null;
  region: string | null;
  bedrooms: number | null;
  parking: number | null;
  area: number | null;
  property_type: string | null;
};

type FeaturedPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image: string | null;
  tags: string[] | null;
};

type RegionCounts = Record<string, number>;

const isUsableImg = (u: string) =>
  /^https?:\/\//.test(u) && !/(logo|favicon|whats|placeholder|topo_contato)/i.test(u);

async function fetchFeatured(): Promise<FeaturedProperty[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "slug,title,internal_code,price_sale,price_rent,images,last_seen_at,neighborhood,city,region,bedrooms,parking,area_useful,area_total,property_type",
    )
    .eq("status", "active")
    .order("last_seen_at", { ascending: false })
    .limit(24);
  if (error) return [];
  const rows = (data ?? []).map((p) => {
    const imgs = Array.isArray(p.images) ? (p.images as string[]).filter(isUsableImg) : [];
    return {
      slug: p.slug,
      title: p.title,
      internal_code: p.internal_code,
      price_sale: p.price_sale,
      price_rent: p.price_rent,
      image: imgs[0] ?? null,
      neighborhood: p.neighborhood,
      city: p.city,
      region: p.region,
      bedrooms: p.bedrooms,
      parking: p.parking,
      area: p.area_useful ?? p.area_total ?? null,
      property_type: p.property_type,
    } as FeaturedProperty;
  });
  return rows.filter((p) => p.image).slice(0, 8);
}

async function fetchLatestPosts(): Promise<FeaturedPost[]> {
  const { data, error } = await supabase
    .from("editorial_pages")
    .select("id,slug,title,excerpt,featured_image,tags,published_at")
    .eq("status", "published")
    .eq("content_type", "blog")
    .order("published_at", { ascending: false })
    .limit(3);
  if (error) return [];
  return (data ?? []) as FeaturedPost[];
}

async function fetchRegionCounts(): Promise<RegionCounts> {
  const regions = ["alphaville", "tambore", "barueri", "santana"] as const;
  const entries = await Promise.all(
    regions.map(async (key) => {
      const pattern =
        key === "santana" ? "%santana%" : key === "tambore" ? "%tambor%" : `%${key}%`;
      const { count } = await supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .or(`region.ilike.${pattern},city.ilike.${pattern},neighborhood.ilike.${pattern}`);
      return [key, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries);
}

async function loadHome() {
  const [properties, posts, regionCounts] = await Promise.all([
    fetchFeatured(),
    fetchLatestPosts(),
    fetchRegionCounts(),
  ]);
  return { properties, posts, regionCounts };
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "S.A Imóveis Alphaville — Portal Editorial Regional" },
      {
        name: "description",
        content:
          "Portal editorial sobre Alphaville, Tamboré, Barueri e Santana de Parnaíba: mercado imobiliário, condomínios, história, gastronomia e cultura de alto padrão.",
      },
      { property: "og:title", content: "S.A Imóveis Alphaville — Portal Editorial Regional" },
      {
        property: "og:description",
        content:
          "Portal editorial sobre Alphaville, Tamboré, Barueri e Santana de Parnaíba: mercado imobiliário, condomínios, história, gastronomia e cultura de alto padrão.",
      },
      { property: "og:url", content: "/" },
      { property: "og:image", content: heroImg },
    ],
    links: [
      { rel: "canonical", href: "/" },
      { rel: "preload", as: "image", href: heroImg, fetchpriority: "high" },
    ],
  }),
  loader: () => loadHome(),
  component: HomePage,
});

const FALLBACK_ARTICLES = [
  { eyebrow: "Mercado", title: "Tendências de valorização no Tamboré", lead: "Entenda os fatores que impulsionaram o crescimento de dois dígitos no último semestre.", image: interiorImg, alt: "Sala de estar minimalista em apartamento de alto padrão em Tamboré." },
  { eyebrow: "História", title: "50 anos de Alphaville: de fazenda a metrópole", lead: "Uma retrospectiva sobre o projeto urbanístico que mudou Barueri para sempre.", image: gardenImg, alt: "Jardim arborizado em condomínio fechado de Alphaville." },
  { eyebrow: "Guia", title: "A nova cena gastronômica de Santana de Parnaíba", lead: "Onde a tradição colonial encontra a sofisticação da culinária contemporânea.", image: clubhouseImg, alt: "Clube de golfe contemporâneo na região de Alphaville." },
] as const;

const REGIONS = [
  { slug: "alphaville", label: "Alphaville", to: "/guia-alphaville", image: alphavilleImg, description: "Dossiê completo sobre o primeiro grande complexo de condomínios fechados do Brasil." },
  { slug: "tambore", label: "Tamboré", to: "/guia-tambore", image: tamboreImg, description: "Residenciais de luxo, clubes, escolas e mercado em valorização." },
  { slug: "barueri", label: "Barueri", to: "/guia-barueri", image: barueriImg, description: "Polo corporativo: história, benefícios fiscais, empresas e mobilidade." },
  { slug: "santana", label: "Santana de Parnaíba", to: "/guia-santana-de-parnaiba", image: santanaImg, description: "Centro histórico tombado, gastronomia e novos condomínios." },
];

const STATS = [
  { number: "15+", label: "Anos de expertise regional" },
  { number: "2.500+", label: "Famílias atendidas em Alphaville e região" },
  { number: "98%", label: "Índice de satisfação em pós-venda" },
];


function HomePage() {
  const { properties, posts, regionCounts } = Route.useLoaderData() as {
    properties: FeaturedProperty[];
    posts: FeaturedPost[];
    regionCounts: RegionCounts;
  };
  const navigate = useNavigate();

  const handleHeroSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const purposeRaw = String(fd.get("modalidade") ?? "");
    const cityRaw = String(fd.get("cidade") ?? "");
    const q = String(fd.get("q") ?? "").trim();
    const parsed = interpretQuery(q);
    const purposeMap: Record<string, string> = { venda: "sale", aluguel: "rent" };
    const search = toImoveisSearchParams(parsed, {
      purpose: purposeMap[purposeRaw] ?? undefined,
      city: cityRaw || undefined,
    });
    navigate({ to: "/imoveis", search });
  };


  return (
    <SiteLayout>
      {/* =============== HERO + BARRA DE BUSCA =============== */}
      <section className="relative bg-[#EAEAE6]">
        <div className="max-w-7xl mx-auto px-6 pt-12 md:pt-20 pb-32 md:pb-40">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-end">
            <div className="lg:col-span-7">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#1A1A1A]/60 mb-6">
                Destaque Editorial
              </p>
              <h1 className="font-display text-5xl md:text-7xl font-medium leading-[1.02] tracking-tight text-[#0D0D0D] text-balance max-w-[18ch]">
                A evolução silenciosa da arquitetura em Alphaville
              </h1>
              <p className="mt-8 text-[#1A1A1A]/75 text-lg leading-relaxed max-w-[52ch] text-pretty">
                Uma análise profunda sobre como o design contemporâneo está redefinindo o
                horizonte dos residenciais de alto padrão na região metropolitana de São Paulo.
              </p>
              <div className="mt-10">
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] font-medium border-b border-[#0D0D0D] pb-1 hover:text-[#0D0D0D]/60"
                >
                  Ler reportagem
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="group overflow-hidden">
                <img
                  src={heroImg}
                  alt="Residência contemporânea em concreto aparente em Alphaville."
                  width={1080}
                  height={1440}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="photo-bw w-full aspect-[3/4] object-cover bg-[#1A1A1A]/10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Barra de busca sobreposta */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-10 w-[min(100%,1120px)] px-6">
          <form
            action="/imoveis"
            method="get"
            onSubmit={handleHeroSearch}
            className="bg-white shadow-[0_20px_60px_-20px_rgba(13,13,13,0.35)] ring-1 ring-black/5 grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_auto] gap-0 divide-y md:divide-y-0 md:divide-x divide-black/10"
          >
            <label className="flex flex-col justify-center px-5 py-3">
              <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[#1A1A1A]/60">
                Modalidade
              </span>
              <select
                name="modalidade"
                className="mt-1 bg-transparent text-sm font-medium text-[#0D0D0D] outline-none"
                defaultValue=""
              >
                <option value="">Venda ou Aluguel</option>
                <option value="venda">Venda</option>
                <option value="aluguel">Aluguel</option>
              </select>
            </label>
            <label className="flex flex-col justify-center px-5 py-3">
              <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[#1A1A1A]/60">
                Cidade
              </span>
              <select
                name="cidade"
                className="mt-1 bg-transparent text-sm font-medium text-[#0D0D0D] outline-none"
                defaultValue=""
              >
                <option value="">Todas as cidades</option>
                <option>Barueri</option>
                <option>Santana de Parnaíba</option>
                <option>Osasco</option>
              </select>
            </label>
            <label className="flex flex-col justify-center px-5 py-3">
              <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-[#1A1A1A]/60">
                Bairro, endereço ou código
              </span>
              <input
                type="search"
                name="q"
                placeholder="Ex.: casa com 4 quartos em Santana de Parnaíba"
                className="mt-1 bg-transparent text-sm font-medium text-[#0D0D0D] placeholder:text-[#1A1A1A]/40 outline-none"
              />
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 bg-[#F2DA00] text-[#0D0D0D] px-8 py-4 md:py-0 text-[12px] font-bold uppercase tracking-[0.2em] hover:brightness-95 transition"
            >
              <Search className="h-4 w-4" strokeWidth={2.4} />
              Pesquisar imóveis
            </button>
          </form>
        </div>
      </section>

      {/* =============== RADAR S.A. IMÓVEIS =============== */}
      <div className="pt-24 md:pt-28 bg-white">
        <RadarSection />
      </div>



      {/* =============== REGIÕES =============== */}
      <section className="pt-28 md:pt-32 pb-20 md:pb-24 bg-[#EAEAE6] px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#1A1A1A]/60 mb-3">
                Regiões
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-medium text-[#0D0D0D]">
                Onde a S.A atua
              </h2>
            </div>
            <Link
              to="/bairros"
              className="text-[11px] uppercase tracking-[0.22em] text-[#0D0D0D] border-b border-[#0D0D0D] pb-1 hover:text-[#0D0D0D]/60"
            >
              Ver todos os bairros →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {REGIONS.map((r) => (
              <PremiumRegionCard
                key={r.to}
                to={r.to}
                slug={r.slug}
                title={r.label}
                description={r.description}
                image={r.image}
                count={regionCounts[r.slug] ?? null}
              />
            ))}
          </div>
        </div>
      </section>

      {/* =============== PERSPECTIVAS RECENTES (BLOG) =============== */}
      <section className="py-24 bg-[#0D0D0D] text-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12 border-b border-white/10 pb-4 gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#F2DA00] mb-3">
                Editorial
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-medium">
                Perspectivas Recentes
              </h2>
            </div>
            <Link
              to="/blog"
              className="text-[11px] uppercase tracking-[0.22em] text-[#F2DA00] hover:brightness-125"
            >
              Ver todas →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {(posts.length > 0
              ? posts.map((p) => (
                  <PremiumPostCard
                    key={p.id}
                    to="/blog/$slug"
                    params={{ slug: p.slug }}
                    title={p.title}
                    excerpt={p.excerpt}
                    image={p.featured_image}
                    eyebrow={p.tags?.[0] ?? "Editorial"}
                  />
                ))
              : FALLBACK_ARTICLES.map((a) => (
                  <PremiumPostCard
                    key={a.title}
                    to="/blog"
                    title={a.title}
                    excerpt={a.lead}
                    image={a.image}
                    eyebrow={a.eyebrow}
                  />
                )))}
          </div>
        </div>
      </section>

      {/* =============== IMÓVEIS EM DESTAQUE =============== */}
      <section className="py-24 bg-[#EAEAE6] px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12 gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#1A1A1A]/60 mb-3">
                Curadoria S.A
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-medium text-[#0D0D0D]">
                Imóveis em destaque
              </h2>
            </div>
            <Link
              to="/imoveis"
              className="text-[11px] uppercase tracking-[0.22em] text-[#0D0D0D] border-b border-[#0D0D0D] pb-1 hover:text-[#0D0D0D]/60"
            >
              Ver portfólio completo →
            </Link>
          </div>
          {properties.length === 0 ? (
            <p className="text-sm text-[#1A1A1A]/60">Em breve novos imóveis em destaque.</p>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
              {properties.map((p) => (
                <div key={p.slug} className="flex-shrink-0 w-72 md:w-80 snap-start">
                  <PremiumPropertyCard
                    slug={p.slug}
                    title={p.title}
                    image={p.image}
                    priceSale={p.price_sale}
                    priceRent={p.price_rent}
                    internalCode={p.internal_code}
                    neighborhood={p.neighborhood}
                    city={p.city}
                    region={p.region}
                    bedrooms={p.bedrooms}
                    parking={p.parking}
                    area={p.area}
                    propertyType={p.property_type}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =============== NÚMEROS =============== */}
      <section className="py-24 bg-[#EAEAE6] px-6 border-y border-[#0D0D0D]/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col">
                <span className="font-display text-6xl md:text-7xl font-medium leading-none text-[#0D0D0D]">
                  {s.number}
                </span>
                <span className="mt-4 text-[11px] uppercase tracking-[0.28em] font-semibold text-[#1A1A1A]/70 max-w-[26ch]">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =============== TERRITÓRIOS DE AUTORIDADE (GUIAS) =============== */}
      <section className="py-24 bg-[#0D0D0D] text-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-[52ch] mb-16">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#F2DA00] mb-3">
              Guias Regionais
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-medium mb-6 leading-tight">
              Territórios de autoridade
            </h2>
            <p className="text-white/70 leading-relaxed">
              Nossa expertise local traduzida em guias detalhados sobre cada cidade e seus
              ecossistemas de vida e investimento.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {REGIONS.map((r) => (
              <PremiumRegionCard
                key={r.to}
                to={r.to}
                slug={r.slug}
                title={r.label}
                description={r.description}
                image={r.image}
              />
            ))}
          </div>
        </div>
      </section>

      {/* =============== AVALIAÇÕES GOOGLE =============== */}
      <GoogleReviewsSection />


      {/* =============== NEWSLETTER =============== */}
      <section className="py-24 bg-[#0D0D0D] text-white px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#F2DA00] mb-4">
            Newsletter S.A
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-medium leading-[1.05] text-balance">
            Receba as melhores oportunidades e análises do mercado de Alphaville
          </h2>
          <p className="mt-6 text-white/70 max-w-[52ch] mx-auto leading-relaxed">
            Cadastre-se para receber nossas curadorias editoriais, novos imóveis e relatórios de
            mercado direto no seu e-mail. Sem spam, apenas o que importa.
          </p>
          <NewsletterForm />
          
        </div>
      </section>

      <InstitutionalBlock />
    </SiteLayout>
  );
}
