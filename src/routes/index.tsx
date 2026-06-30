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
  loader: () => fetchFeatured(),
  component: HomePage,
});

const ARTICLES = [
  {
    eyebrow: "Mercado",
    title: "Tendências de valorização no Tamboré",
    lead: "Entenda os fatores que impulsionaram o crescimento de dois dígitos no último semestre.",
    image: interiorImg,
    alt: "Sala de estar minimalista em apartamento de alto padrão em Tamboré.",
  },
  {
    eyebrow: "História",
    title: "50 anos de Alphaville: de fazenda a metrópole",
    lead: "Uma retrospectiva sobre o projeto urbanístico que mudou Barueri para sempre.",
    image: gardenImg,
    alt: "Jardim arborizado em condomínio fechado de Alphaville.",
  },
  {
    eyebrow: "Guia",
    title: "A nova cena gastronômica de Santana de Parnaíba",
    lead: "Onde a tradição colonial encontra a sofisticação da culinária contemporânea.",
    image: clubhouseImg,
    alt: "Clube de golfe contemporâneo na região de Alphaville.",
  },
] as const;

const REGIONS = [
  { label: "Alphaville", to: "/guia-alphaville" as const, image: alphavilleImg, alt: "Vista aérea de Alphaville em preto e branco." },
  { label: "Tamboré", to: "/guia-tambore" as const, image: tamboreImg, alt: "Arquitetura contemporânea em Tamboré." },
  { label: "Barueri", to: "/guia-barueri" as const, image: barueriImg, alt: "Skyline corporativo de Barueri." },
  { label: "S. Parnaíba", to: "/guia-santana-de-parnaiba" as const, image: santanaImg, alt: "Casario colonial de Santana de Parnaíba." },
];


function HomePage() {
  const properties = Route.useLoaderData() as FeaturedProperty[];
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
      <section className="py-24 bg-muted/50 border-y border-ink/8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12 border-b border-ink/8 pb-4">
            <h2 className="font-serif text-2xl font-medium">Perspectivas Recentes</h2>
            <Link to="/blog" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-ink">
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {ARTICLES.map((a) => (
              <article key={a.title} className="group">
                <img
                  src={a.image}
                  alt={a.alt}
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="w-full aspect-[4/3] object-cover mb-6 bg-muted"
                />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{a.eyebrow}</p>
                <h3 className="font-serif text-xl font-medium mb-3 text-balance group-hover:underline decoration-ink/30 underline-offset-4">
                  {a.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty">{a.lead}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Properties */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6 mb-12">
            <h2 className="font-serif text-2xl font-medium whitespace-nowrap">Curadoria S.A</h2>
            <div className="h-px w-full bg-ink/8" />
            <Link to="/imoveis" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-ink whitespace-nowrap">
              Portfólio
            </Link>
          </div>
          <div className="flex gap-8 overflow-x-auto pb-4 no-scrollbar">
            {properties.length === 0 ? (
              <p className="text-sm text-muted-foreground">Em breve novos imóveis em destaque.</p>
            ) : properties.map((p) => {
              const sale = fmtPriceBR(p.price_sale);
              const rent = fmtPriceBR(p.price_rent);
              const price = sale ?? rent ?? "Sob consulta";
              return (
                <Link
                  key={p.slug}
                  to="/imoveis/$slug"
                  params={{ slug: p.slug }}
                  className="group flex-shrink-0 w-80"
                >
                  <img
                    src={p.image!}
                    alt={p.title}
                    loading="lazy"
                    width={768}
                    height={1024}
                    className="w-full aspect-[3/4] object-cover bg-muted mb-4 group-hover:opacity-90 transition-opacity"
                  />
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-widest line-clamp-1">{p.title}</p>
                      {p.internal_code && (
                        <p className="text-xs text-muted-foreground mt-1">Cód. {p.internal_code}</p>
                      )}
                    </div>
                    <p className="text-sm font-medium whitespace-nowrap">{price}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Regions */}
      <section className="py-24 bg-ink text-canvas px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-[52ch] mb-16">
            <h2 className="font-serif text-4xl md:text-5xl font-medium mb-6 leading-tight">
              Territórios de autoridade
            </h2>
            <p className="text-canvas/60 leading-relaxed">
              Nossa expertise local traduzida em guias detalhados sobre cada cidade e seus
              ecossistemas de vida e investimento.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {REGIONS.map((r) => (
              <Link
                key={r.to}
                to={r.to}
                className="group relative aspect-[4/5] overflow-hidden bg-canvas/5"
              >
                <img
                  src={r.image}
                  alt={r.alt}
                  loading="lazy"
                  width={1024}
                  height={1280}
                  className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <span className="text-xs uppercase tracking-[0.2em] font-medium">{r.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <InstitutionalBlock />
    </SiteLayout>
  );
}
