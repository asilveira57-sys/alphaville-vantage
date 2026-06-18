import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { supabase } from "@/integrations/supabase/client";

const isUsableImg = (u: string) =>
  /^https?:\/\//.test(u) &&
  !/(logo|favicon|whats|placeholder|topo_contato)/i.test(u);

const fmtPrice = (n: number | null) =>
  n == null ? null : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(n));

async function fetchProperty(slug: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw notFound();
  return {
    ...data,
    images: Array.isArray(data.images) ? (data.images as string[]).filter(isUsableImg) : [],
  };
}

export const Route = createFileRoute("/imoveis/$slug")({
  loader: ({ params }) => fetchProperty(params.slug),
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Imóvel"} — S.A Imóveis Alphaville` },
      { name: "description", content: loaderData?.description?.slice(0, 160) ?? "Imóvel em Alphaville." },
    ],
  }),
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground">Não foi possível carregar este imóvel: {error.message}</p>
        <Link to="/imoveis" className="mt-6 inline-block text-sm underline">Voltar ao catálogo</Link>
      </section>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <h1 className="font-serif text-3xl mb-4">Imóvel não encontrado</h1>
        <Link to="/imoveis" className="text-sm underline">Voltar ao catálogo</Link>
      </section>
    </SiteLayout>
  ),
  component: PropertyDetail,
});

function PropertyDetail() {
  const p = Route.useLoaderData();
  const sale = fmtPrice(p.price_sale);
  const rent = fmtPrice(p.price_rent);
  const specs: { label: string; value: string }[] = [];
  if (p.bedrooms) specs.push({ label: "Dormitórios", value: String(p.bedrooms) });
  if (p.suites) specs.push({ label: "Suítes", value: String(p.suites) });
  if (p.parking) specs.push({ label: "Vagas", value: String(p.parking) });
  if (p.area_useful) specs.push({ label: "Área útil", value: `${Number(p.area_useful)} m²` });
  if (p.area_total) specs.push({ label: "Área total", value: `${Number(p.area_total)} m²` });

  return (
    <SiteLayout>
      <section className="px-6 pt-16 pb-12 border-b border-ink/8">
        <div className="max-w-6xl mx-auto">
          <nav className="mb-8">
            <Link to="/imoveis" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-ink">
              ← Voltar ao catálogo
            </Link>
          </nav>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">
            {p.property_type ?? "Imóvel"}{p.purpose === "rent" ? " · Locação" : p.purpose === "sale" ? " · Venda" : ""}
          </p>
          <h1 className="font-serif text-3xl md:text-4xl leading-tight text-balance">{p.title}</h1>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
            {sale && <span className="font-serif text-2xl">{sale}</span>}
            {rent && <span className="text-muted-foreground">{rent}/mês</span>}
          </div>
        </div>
      </section>

      <section className="px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {p.images.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {p.images.slice(0, 8).map((src, i) => (
                <img key={i} src={src} alt={`${p.title} — imagem ${i + 1}`} loading="lazy" className="w-full aspect-[4/3] object-cover bg-ink/5" />
              ))}
            </div>
          ) : (
            <div className="aspect-[16/9] bg-ink/5 flex items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
              Sem imagens disponíveis
            </div>
          )}
        </div>
      </section>

      <section className="px-6 py-12 border-t border-ink/8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
          <div className="md:col-span-2">
            <h2 className="font-serif text-2xl mb-4">Descrição</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-pretty">
              {p.description || "Sem descrição cadastrada."}
            </p>
            {p.source_url && (
              <a href={p.source_url} target="_blank" rel="noreferrer" className="mt-6 inline-block text-xs uppercase tracking-widest underline">
                Ver anúncio original
              </a>
            )}
          </div>
          {specs.length > 0 && (
            <aside>
              <h2 className="font-serif text-2xl mb-4">Ficha</h2>
              <dl className="divide-y divide-ink/10 border-t border-ink/10">
                {specs.map((s) => (
                  <div key={s.label} className="flex justify-between py-3 text-sm">
                    <dt className="text-muted-foreground">{s.label}</dt>
                    <dd className="text-ink">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          )}
        </div>
      </section>

      <InstitutionalBlock />
    </SiteLayout>
  );
}
