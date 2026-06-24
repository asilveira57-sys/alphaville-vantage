import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionPage, ComingSoonGrid } from "@/components/section-page";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://alphaville-vantage.lovable.app";

async function fetchCondominiums() {
  const { data, error } = await supabase
    .from("condominiums")
    .select("id,slug,name,region,description,cover_image_url,units_count,year_built")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export const Route = createFileRoute("/condominios")({
  loader: fetchCondominiums,
  head: () => ({
    meta: [
      { title: "Condomínios de Alphaville e Tamboré — S.A Imóveis Alphaville" },
      { name: "description", content: "Conheça todos os condomínios de Alphaville e Tamboré: residenciais, perfis, infraestrutura, valorização e curiosidades." },
      { property: "og:title", content: "Condomínios de Alphaville e Tamboré" },
      { property: "og:description", content: "Dossiê de todos os condomínios da região." },
      { property: "og:url", content: `${SITE_URL}/condominios` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/condominios` }],
  }),
  component: CondosPage,
});

function CondosPage() {
  const condos = Route.useLoaderData();

  return (
    <SectionPage
      eyebrow="Catálogo"
      title="Condomínios da região"
      lead="Um guia editorial dos residenciais de Alphaville, Tamboré e Santana de Parnaíba. Cada condomínio com sua história, perfil, infraestrutura e dinâmica de valorização."
      breadcrumbs={[{ label: "Condomínios" }]}
    >
      {condos.length === 0 ? (
        <ComingSoonGrid
          items={[
            { eyebrow: "Histórico", title: "Residencial 1", lead: "O primeiro condomínio de Alphaville." },
            { eyebrow: "Clássico", title: "Residencial 10", lead: "O maior em área verde por unidade." },
            { eyebrow: "Premium", title: "Tamboré 11", lead: "O mais novo e disputado da região." },
            { eyebrow: "Lazer", title: "Gênesis I e II", lead: "Estrutura completa para famílias." },
            { eyebrow: "Executivo", title: "Alphaville Zero", lead: "Localização nobre e perfil corporativo." },
            { eyebrow: "Investimento", title: "Edifícios verticais", lead: "Lançamentos e oportunidades de locação." },
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
          {condos.map((c: typeof condos[number]) => (
            <Link key={c.id} to="/condominio/$slug" params={{ slug: c.slug }} className="group block border-t border-ink/10 pt-6">
              {c.cover_image_url && (
                <div className="aspect-[4/3] bg-ink/5 overflow-hidden mb-4 -mt-6 -mx-0">
                  <img src={c.cover_image_url} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
              )}
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">{c.region ?? "Condomínio"}</p>
              <h3 className="font-serif text-2xl font-medium leading-snug mb-3 text-balance group-hover:underline">{c.name}</h3>
              {c.description && (
                <p className="text-sm text-muted-foreground leading-relaxed text-pretty line-clamp-3">{c.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </SectionPage>
  );
}
