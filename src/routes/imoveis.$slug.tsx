import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { PropertyGallery } from "@/components/property-gallery";
import { supabase } from "@/integrations/supabase/client";
import { buildRealEstateJsonLd, type SeoSource } from "@/lib/property-seo";
import { humanizeOriginalDescription } from "@/lib/property-parser";

const SITE_URL = "https://alphaville-vantage.lovable.app";

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

  // Veja também: até 3 imóveis no mesmo bairro/tipo, excluindo o atual.
  let related: Array<{ id: string; slug: string; title: string; seo_title: string | null; property_type: string | null; price_sale: number | null; price_rent: number | null; images: string[] }> = [];
  if (data.neighborhood) {
    const { data: rel } = await supabase
      .from("properties")
      .select("id,slug,title,seo_title,property_type,price_sale,price_rent,images")
      .eq("status", "active")
      .eq("neighborhood", data.neighborhood)
      .neq("id", data.id)
      .order("last_seen_at", { ascending: false })
      .limit(6);
    related = (rel ?? [])
      .map((r) => ({ ...r, images: Array.isArray(r.images) ? (r.images as string[]).filter(isUsableImg) : [] }))
      .filter((r) => !data.property_type || r.property_type === data.property_type || true)
      .slice(0, 3);
  }

  return {
    ...data,
    images: Array.isArray(data.images) ? (data.images as string[]).filter(isUsableImg) : [],
    related,
  };
}

export const Route = createFileRoute("/imoveis/$slug")({
  loader: ({ params }) => fetchProperty(params.slug),
  head: ({ params, loaderData }) => {
    const p = loaderData;
    const url = `${SITE_URL}/imoveis/${params.slug}`;
    const title = p?.seo_title ?? `${p?.title ?? "Imóvel"} — S.A Imóveis Alphaville`;
    const description = p?.seo_description ?? p?.description?.slice(0, 160) ?? "Imóvel em Alphaville.";
    const image = (p?.images?.[0] as string | undefined) ?? undefined;
    const jsonLd = p ? buildRealEstateJsonLd(p as unknown as SeoSource, { url, title, description, image }) : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: jsonLd ? [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }] : [],
    };
  },
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
          <nav aria-label="Trilha de navegação" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <li><Link to="/" className="hover:text-ink">Início</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><Link to="/imoveis" className="hover:text-ink">Imóveis</Link></li>
              {p.neighborhood === "Alphaville" && (
                <li className="flex items-center gap-2"><span aria-hidden>/</span><Link to="/alphaville" className="hover:text-ink">Alphaville</Link></li>
              )}
              <li className="flex items-center gap-2"><span aria-hidden>/</span><span className="text-ink truncate max-w-[40ch]">{p.title}</span></li>
            </ol>
          </nav>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-6">
            {p.property_type ?? "Imóvel"}
            {p.purpose === "rent" ? " · Locação" : p.purpose === "sale" ? " · Venda" : p.purpose === "both" ? " · Venda/Locação" : ""}
          </p>
          <h1 className="font-serif text-3xl md:text-4xl leading-tight text-balance">{p.seo_title ? p.seo_title.replace(/\s*\|\s*S\.A Im[óo]veis.*$/i, "") : p.title}</h1>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
            {sale && <span className="font-serif text-2xl">{sale}</span>}
            {rent && <span className="text-muted-foreground">{rent}/mês</span>}
          </div>
        </div>
      </section>

      <section className="px-6 py-12 bg-ink/[0.02]">
        <div className="max-w-6xl mx-auto">
          <PropertyGallery images={p.images} title={p.title} />
        </div>
      </section>


      <section className="px-6 py-12 border-t border-ink/8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
          <div className="md:col-span-2">
            <h2 className="font-serif text-2xl mb-4">Sobre este imóvel</h2>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-pretty">
              {p.descricao_seo || p.description || "Sem descrição cadastrada."}
            </div>
            {p.descricao_original && p.descricao_original !== p.descricao_seo && (
              <details className="mt-6 text-sm">
                <summary className="cursor-pointer text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-ink">
                  Ver descrição original do anúncio
                </summary>
                <div className="mt-3 text-muted-foreground whitespace-pre-line text-pretty leading-relaxed">
                  {humanizeOriginalDescription(p.descricao_original)}
                </div>
              </details>
            )}
            {p.source_url && (
              <a
                href={p.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex items-center gap-2 bg-brand-yellow text-brand-dark px-5 py-3 text-xs font-bold uppercase tracking-widest hover:brightness-95 transition"
              >
                Mais detalhes deste imóvel no site da corretora ↗
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
              <Row label="Banheiros" value={p.bathrooms} />
              <Row label="Lavabos" value={p.lavabos} />
              <Row label="Vagas" value={
                p.parking_covered != null || p.parking_uncovered != null
                  ? `${(p.parking_covered ?? 0) + (p.parking_uncovered ?? 0)}${(p.parking_covered || p.parking_uncovered) ? ` (${[p.parking_covered ? `${p.parking_covered} coberta${p.parking_covered === 1 ? "" : "s"}` : null, p.parking_uncovered ? `${p.parking_uncovered} descoberta${p.parking_uncovered === 1 ? "" : "s"}` : null].filter(Boolean).join(" + ")})` : ""}`
                  : p.parking
              } />
              <Row label="Área útil" value={p.area_useful ? `${Number(p.area_useful)} m²` : null} />
              <Row label="Área construída" value={p.area_built ? `${Number(p.area_built)} m²` : null} />
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

      {p.related && p.related.length > 0 && (
        <section className="px-6 py-20 border-t border-ink/8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-baseline justify-between mb-10">
              <h2 className="font-serif text-3xl">Veja também</h2>
              <Link to="/imoveis" className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-ink">Ver todos →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
              {p.related.map((r) => (
                <Link key={r.id} to="/imoveis/$slug" params={{ slug: r.slug }} className="group block">
                  <div className="aspect-[4/3] bg-ink/5 overflow-hidden mb-4">
                    {r.images[0] && <img src={r.images[0]} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />}
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{r.property_type ?? "Imóvel"}</p>
                  <h3 className="font-serif text-lg leading-snug mb-2 text-balance group-hover:underline">{r.seo_title?.replace(/\s*\|\s*S\.A.*$/i, "") ?? r.title}</h3>
                  <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4">
                    {r.price_sale && <span>{fmtPrice(r.price_sale)}</span>}
                    {r.price_rent && <span>{fmtPrice(r.price_rent)}/mês</span>}
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
