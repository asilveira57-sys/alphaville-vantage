import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { supabase } from "@/integrations/supabase/client";

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
};

type FeaturedPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featured_image: string | null;
  tags: string[] | null;
};

const isUsableImg = (u: string) =>
  /^https?:\/\//.test(u) && !/(logo|favicon|whats|placeholder|topo_contato)/i.test(u);

const fmtPriceBR = (n: number | null) =>
  n == null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

async function fetchFeatured(): Promise<FeaturedProperty[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("slug,title,internal_code,price_sale,price_rent,images,last_seen_at")
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
    } as FeaturedProperty;
  });
  return rows.filter((p) => p.image).slice(0, 6);
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

async function loadHome() {
  const [properties, posts] = await Promise.all([fetchFeatured(), fetchLatestPosts()]);
  return { properties, posts };
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
          "Autoridade digital sobre Alphaville e região. Mercado imobiliário, condomínios, história e estilo de vida.",
      },
      { property: "og:url", content: "/" },
      { property: "og:image", content: heroImg },
    ],
    links: [{ rel: "canonical", href: "/" }],
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


function HomePage() {
  const { properties, posts } = Route.useLoaderData() as { properties: FeaturedProperty[]; posts: FeaturedPost[] };
  return (
    <SiteLayout>
      {/* Hero */}
      <section className="py-12 md:py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-7 flex flex-col justify-end">
              <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-6">
                Destaque Editorial
              </p>
              <h1 className="font-serif text-5xl md:text-7xl font-medium leading-[1] tracking-tight text-balance max-w-[20ch]">
                A evolução silenciosa da arquitetura em Alphaville
              </h1>
              <p className="mt-8 text-muted-foreground text-lg leading-relaxed max-w-[52ch] text-pretty">
                Uma análise profunda sobre como o design contemporâneo está redefinindo o
                horizonte dos residenciais de alto padrão na região metropolitana de São Paulo.
              </p>
              <div className="mt-10">
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-medium border-b border-ink pb-1 hover:text-muted-foreground"
                >
                  Ler reportagem
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <img
                src={heroImg}
                alt="Residência contemporânea em concreto aparente em Alphaville, fotografia preto e branco."
                width={1080}
                height={1440}
                className="w-full aspect-[3/4] object-cover bg-muted"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-24 bg-navy-deep text-canvas px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12 border-b border-white/10 pb-4 gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">Editorial</p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium">Perspectivas Recentes</h2>
            </div>
            <Link to="/blog" className="text-[11px] uppercase tracking-[0.22em] text-gold hover:text-gold-soft">
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
                ))
            )}
          </div>
        </div>
      </section>

      {/* Properties */}
      <section className="py-24 bg-canvas px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12 gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">Curadoria S.A</p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium text-ink">Imóveis em destaque</h2>
            </div>
            <Link to="/imoveis" className="text-[11px] uppercase tracking-[0.22em] text-ink/70 hover:text-ink">
              Ver portfólio completo →
            </Link>
          </div>
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">Em breve novos imóveis em destaque.</p>
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
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Regions */}
      <section className="py-24 bg-navy-deep text-canvas px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-[52ch] mb-16">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">Guias Regionais</p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium mb-6 leading-tight">
              Territórios de autoridade
            </h2>
            <p className="text-canvas/65 leading-relaxed">
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


      <InstitutionalBlock />
    </SiteLayout>
  );
}
