import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { supabase } from "@/integrations/supabase/client";

const isUsableImg = (u: string) =>
  /^https?:\/\//.test(u) &&
  !/(logo|favicon|whats|placeholder|topo_contato|supremo_|topo_)/i.test(u);

const fmtPrice = (n: number | null) =>
  n == null
    ? null
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(n));

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

function fmtPurpose(v: string | null) {
  if (v === "rent") return "Locação";
  if (v === "sale") return "Venda";
  if (v === "both") return "Venda/Locação";
  return v ?? null;
}

function fmtStatus(v: string | null) {
  if (v === "active") return "Ativo";
  return v ?? null;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" ) return null;
  return (
    <div className="flex justify-between gap-6 py-3 text-sm border-b border-ink/10">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-ink text-right break-all">{value}</dd>
    </div>
  );
}

function PropertyDetail() {
  const p = Route.useLoaderData();
  const sale = fmtPrice(p.price_sale);
  const rent = fmtPrice(p.price_rent);

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
            {p.property_type ?? "Imóvel"}
            {p.purpose === "rent" ? " · Locação" : p.purpose === "sale" ? " · Venda" : p.purpose === "both" ? " · Venda/Locação" : ""}
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
              {p.images.slice(0, 12).map((src: string, i: number) => (
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
                Ver anúncio original ↗
              </a>
            )}
          </div>
          <aside>
            <h2 className="font-serif text-2xl mb-4">Dados do imóvel</h2>
            <dl className="border-t border-ink/10">
              <Row label="Tipo" value={p.property_type} />
              <Row label="Finalidade" value={fmtPurpose(p.purpose)} />
              <Row label="Região" value={p.region} />
              <Row label="Dormitórios" value={p.bedrooms} />
              <Row label="Suítes" value={p.suites} />
              <Row label="Vagas" value={p.parking} />
              <Row label="Área útil" value={p.area_useful ? `${Number(p.area_useful)} m²` : null} />
              <Row label="Área total" value={p.area_total ? `${Number(p.area_total)} m²` : null} />
              <Row label="Venda" value={sale} />
              <Row label="Locação" value={rent ? `${rent}/mês` : null} />
              <Row label="Status" value={fmtStatus(p.status)} />
              <Row label="Última coleta" value={p.last_seen_at ? new Date(p.last_seen_at).toISOString().replace("T", " ").slice(0, 16) + " UTC" : null} />
              <Row label="Imagens" value={`${p.images.length}`} />
              <Row label="Slug" value={<code className="text-xs">{p.slug}</code>} />
              <Row label="Ref externa" value={<code className="text-xs">{p.external_ref}</code>} />
            </dl>
          </aside>
        </div>
      </section>

      <section className="px-6 py-12 border-t border-ink/8">
        <div className="max-w-6xl mx-auto">
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground uppercase tracking-[0.2em] text-[10px]">
              Debug — payload bruto do scraper
            </summary>
            <pre className="mt-6 p-4 bg-ink/5 overflow-auto text-[11px] leading-relaxed max-h-[500px]">
{JSON.stringify({ ...p, raw: p.raw ? { ...(p.raw as object), html_excerpt: "[omitido — ver source_url]" } : null }, null, 2)}
            </pre>
          </details>
        </div>
      </section>

      <InstitutionalBlock />
    </SiteLayout>
  );
}
