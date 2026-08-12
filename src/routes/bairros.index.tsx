import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { PremiumRegionCard } from "@/components/premium-cards/region-card";
import { listPublishedByType } from "@/lib/editorial.functions";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const QO = queryOptions({
  queryKey: ["editorial", "bairro"],
  queryFn: () => listPublishedByType({ data: { type: "bairro" } }),
});

const GUIA_IMAGES_QO = queryOptions({
  queryKey: ["guia-region-images"],
  queryFn: async () => {
    const { data } = await supabase
      .from("editorial_pages")
      .select("slug,featured_image")
      .in("slug", ["guia-alphaville", "guia-tambore", "guia-barueri", "guia-santana-de-parnaiba"]);
    const map: Record<string, string> = {};
    for (const r of (data ?? []) as Array<{ slug: string; featured_image: string | null }>) {
      if (r.featured_image) map[r.slug] = r.featured_image;
    }
    return map;
  },
});

const GUIAS = [
  { slug: "alphaville", to: "/guia-alphaville", title: "Alphaville", description: "Dossiê completo sobre o primeiro grande complexo de condomínios fechados do Brasil." },
  { slug: "tambore", to: "/guia-tambore", title: "Tamboré", description: "Residenciais de luxo, clubes, escolas e mercado em valorização." },
  { slug: "barueri", to: "/guia-barueri", title: "Barueri", description: "Polo corporativo: história, benefícios fiscais, empresas e mobilidade." },
  { slug: "santana", to: "/guia-santana-de-parnaiba", title: "Santana de Parnaíba", description: "Centro histórico tombado, gastronomia e novos condomínios." },
];

export const Route = createFileRoute("/bairros/")({
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(QO),
    context.queryClient.ensureQueryData(GUIA_IMAGES_QO),
  ]),
  head: () => ({
    meta: [
      { title: "Bairros de Alphaville, Tamboré e região — S.A Imóveis Alphaville" },
      { name: "description", content: "Guia editorial dos bairros de Alphaville, Tamboré, Barueri e Santana de Parnaíba." },
      { property: "og:title", content: "Bairros da região de Alphaville" },
      { property: "og:url", content: `${SITE_URL}/bairros` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/bairros` }],
  }),
  component: BairrosPage,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="max-w-2xl mx-auto px-6 py-24 text-sm text-red-600">{error.message}</div>
    </SiteLayout>
  ),
  notFoundComponent: () => <div />,
});

function BairrosPage() {
  const { data: items } = useSuspenseQuery(QO);
  const { data: guiaImages } = useSuspenseQuery(GUIA_IMAGES_QO);

  return (
    <SiteLayout>
      <section className="bg-navy-deep text-canvas px-6 pt-20 pb-16">
        <div className="max-w-7xl mx-auto">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">Guias Regionais</p>
          <h1 className="font-serif text-4xl md:text-6xl font-medium leading-[1.05] max-w-[22ch] text-balance">
            Conheça as regiões que fazem Alphaville única
          </h1>
          <p className="mt-6 text-base md:text-lg text-canvas/70 max-w-[62ch] leading-relaxed">
            Guias completos com informações essenciais para morar, investir e viver o melhor
            de Alphaville, Tamboré, Barueri e Santana de Parnaíba.
          </p>
        </div>
      </section>

      <section className="bg-navy-deep px-6 pb-24">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {GUIAS.map((g) => (
            <PremiumRegionCard key={g.slug} to={g.to} slug={g.slug} title={g.title} description={g.description} image={guiaImages[g.to.replace("/", "")]} />
          ))}
        </div>
      </section>

      {items.length > 0 && (
        <section className="bg-canvas px-6 py-20 md:py-24">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10">
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">Dossiês por bairro</p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium text-ink">
                Explore por bairro
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((c) => (
                <PremiumRegionCard
                  key={c.id}
                  to={`/bairros/${c.slug}`}
                  slug={c.slug}
                  title={c.title}
                  description={c.excerpt ?? undefined}
                  image={c.featured_image}
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
