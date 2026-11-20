import { SITE_URL } from "@/lib/site";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ResolvedCta } from "@/components/resolved-cta";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { EditorialContent } from "@/components/editorial-content";
import { CleanPropertyCard } from "@/components/premium-cards/clean-property-card";
import { getListingPage } from "@/lib/listing-pages.functions";
import { EDITORIAL_PUBLISHER } from "@/lib/editorial-topic-properties";
import { ListingSelections } from "@/components/listing-pages/listing-selections";

const pageQO = (slug: string) => queryOptions({
  queryKey: ["listing-page", slug],
  queryFn: () => getListingPage({ data: { slug } }),
});

const brl = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const brlShort = (n: number | null | undefined) => {
  if (n == null) return "—";
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${v < 2 ? "milhão" : "milhões"}`;
  }
  if (n >= 10_000) return `R$ ${Math.round(n / 1000).toLocaleString("pt-BR")} mil`;
  return brl(n);
};
const dateBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

type Data = NonNullable<Awaited<ReturnType<typeof getListingPage>>>;

/** Frase-resposta do topo e FAQ automáticas: números do dia, sempre com data. */
function answerLine(d: Data) {
  const s = d.stats;
  const verbo = d.page.purpose === "rent" ? "para alugar" : "à venda";
  const base = `Hoje (${dateBR(d.generatedAt)}) a S.A Imóveis tem ${s.count} ${s.count === 1 ? "imóvel" : "imóveis"} ${verbo} nesta seleção`;
  if (!s.count) return `${base}.`;
  const faixa = s.count > 1 ? `, de ${brlShort(s.min)} a ${brlShort(s.max)}` : `, por ${brlShort(s.min)}`;
  const med = s.count > 2 ? `; o valor mediano é ${brlShort(s.median)}${d.page.purpose === "rent" ? " por mês" : ""}` : "";
  const m2 = s.medianM2 ? ` e o m² mediano, ${brl(Math.round(s.medianM2))}` : "";
  return `${base}${faixa}${med}${m2}.`;
}

function autoFaq(d: Data) {
  const s = d.stats;
  if (!s.count) return [];
  const label = (d.page.h1 || d.page.title).toLowerCase();
  const out: { question: string; answer: string }[] = [
    { question: `Quantos ${label} existem hoje?`, answer: `${s.count} na carteira da S.A Imóveis em ${dateBR(d.generatedAt)}. A lista é atualizada automaticamente todos os dias.` },
  ];
  if (s.median) out.push({
    question: `Qual o preço médio de ${label}?`,
    answer: `Em ${dateBR(d.generatedAt)}, o valor mediano anunciado é ${brl(s.median)}${d.page.purpose === "rent" ? " por mês" : ""}, com ofertas de ${brl(s.min)} a ${brl(s.max)}.${s.medianM2 ? ` O m² mediano é ${brl(Math.round(s.medianM2))}.` : ""}`,
  });
  if (s.byCondo.length) out.push({
    question: "Em quais condomínios há mais opções?",
    answer: s.byCondo.slice(0, 5).map((c) => `${c.name} (${c.count})`).join(", ") + ".",
  });
  return out;
}

export const Route = createFileRoute("/imoveis-alphaville/$slug")({
  loader: async ({ params, context }) => {
    const d = await context.queryClient.ensureQueryData(pageQO(params.slug));
    if (!d) throw notFound();
    return d;
  },
  head: ({ params, loaderData }) => {
    const d = loaderData as Data | undefined;
    if (!d) return { meta: [{ title: "Imóveis — S.A Imóveis Alphaville" }, { name: "robots", content: "noindex" }] };
    const url = `${SITE_URL}/imoveis-alphaville/${params.slug}`;
    const indexable = d.stats.count >= (d.page.min_items ?? 8);
    const title = `${d.page.title} (${d.stats.count}) — S.A Imóveis`;
    const description = d.page.meta_description || answerLine(d);
    const faq = [...(Array.isArray(d.page.faq) ? d.page.faq : []), ...autoFaq(d)];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: indexable ? "index,follow" : "noindex,follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: d.page.h1 || d.page.title,
            description,
            url,
            dateModified: d.generatedAt,
            publisher: { "@type": "Organization", name: EDITORIAL_PUBLISHER, url: SITE_URL },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: d.stats.count,
              itemListElement: d.items.slice(0, 20).map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/imoveis/${p.slug}`, name: p.title })),
            },
          }),
        },
        ...(faq.length ? [{
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
          }),
        }] : []),
      ],
    };
  },
  component: ListingPage,
  notFoundComponent: () => (
    <SiteLayout>
      <section className="px-6 py-24 max-w-3xl mx-auto text-center">
        <h1 className="font-serif text-3xl mb-4">Seleção não encontrada</h1>
        <Link to="/imoveis" className="text-sm underline">Ver todos os imóveis</Link>
      </section>
    </SiteLayout>
  ),
  errorComponent: ({ error }) => (
    <SiteLayout><section className="px-6 py-24 max-w-3xl mx-auto"><p className="text-sm text-muted-foreground">{(error as Error).message}</p></section></SiteLayout>
  ),
});

function ListingPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(pageQO(slug));
  if (!data) return null;
  const d = data as Data;
  const s = d.stats;
  const faq = [...(Array.isArray(d.page.faq) ? d.page.faq : []), ...autoFaq(d)];
  const filteredPurpose = d.page.purpose;

  return (
    <SiteLayout>
      <section className="px-6 pt-16 md:pt-24 pb-10 border-b border-ink/8">
        <div className="max-w-6xl mx-auto">
          <nav aria-label="Trilha" className="mb-8">
            <ol className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <li><Link to="/" className="hover:text-ink">Início</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><Link to="/imoveis" className="hover:text-ink">Imóveis</Link></li>
              <li className="flex items-center gap-2"><span aria-hidden>/</span><span className="text-ink">{d.page.h1 || d.page.title}</span></li>
            </ol>
          </nav>
          <h1 className="font-serif text-4xl md:text-5xl font-medium leading-[1.08] tracking-tight text-balance max-w-[26ch]">
            {d.page.h1 || d.page.title}
          </h1>
          <p className="mt-6 text-lg text-ink/80 leading-relaxed max-w-[70ch]">{answerLine(d)}</p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Atualizado automaticamente · {dateBR(d.generatedAt)}</p>

          {s.count > 0 && (
            <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-px bg-ink/10 border border-ink/10">
              {[
                { k: "Imóveis", v: String(s.count) },
                { k: d.page.purpose === "rent" ? "Aluguel mediano" : "Preço mediano", v: brlShort(s.median) },
                { k: s.medianM2 ? "m² mediano" : "Área mediana", v: s.medianM2 ? brl(Math.round(s.medianM2)) : s.medianArea ? `${Math.round(s.medianArea)} m²` : "—" },
                { k: "Novos em 30 dias", v: String(s.newLast30) },
              ].map((x) => (
                <div key={x.k} className="bg-canvas p-5">
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{x.k}</dt>
                  <dd className="mt-2 font-serif text-2xl text-ink">{x.v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {d.page.intro_html && (
        <section className="px-6 py-12">
          <div className="max-w-3xl mx-auto"><EditorialContent html={d.page.intro_html} /></div>
        </section>
      )}

      <section className="px-6 py-12 border-t border-ink/8 bg-ink/[0.02]">
        <div className="max-w-6xl mx-auto">
          {d.items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {d.items.map((p) => (
                <CleanPropertyCard
                  key={p.id}
                  slug={p.slug}
                  title={p.title}
                  image={p.card ?? p.image}
                  imageSrcSet={p.card ? `${p.card} 600w, ${p.card.replace(/-600\.webp$/, "-1200.webp")} 1200w` : null}
                  neighborhood={p.condominium_name ?? p.neighborhood}
                  city={p.city}
                  propertyType={p.property_type}
                  priceSale={p.price_sale}
                  priceRent={p.price_rent}
                  purpose={p.purpose}
                  filteredPurpose={filteredPurpose}
                  bedrooms={p.bedrooms}
                  parking={p.parking}
                  area={p.area}
                  internalCode={p.internal_code}
                />
              ))}
            </div>
          ) : (
            <p className="text-base text-ink/80">Nenhum imóvel nesta seleção hoje. <Link to="/imoveis" className="underline">Veja todos os imóveis</Link> ou fale com a S.A Imóveis.</p>
          )}
          {s.count > d.items.length && (
            <p className="mt-8 text-sm text-muted-foreground">Mostrando os {d.items.length} de menor valor. <Link to="/imoveis" className="underline">Refine a busca</Link> para ver todos.</p>
          )}
        </div>
      </section>

      {s.byCondo.length > 0 && (
        <section className="px-6 py-12 border-t border-ink/8">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-6">Condomínios com mais opções</h2>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground"><th className="py-2">Condomínio</th><th className="py-2 text-right">Imóveis</th></tr></thead>
              <tbody>
                {s.byCondo.map((c) => (
                  <tr key={c.name} className="border-t border-ink/10"><td className="py-2">{c.name}</td><td className="py-2 text-right">{c.count}</td></tr>
                ))}
              </tbody>
            </table>
            {s.medianCondoFee && <p className="mt-4 text-sm text-muted-foreground">Taxa de condomínio mediana informada nos anúncios: {brl(Math.round(s.medianCondoFee))} por mês.</p>}
          </div>
        </section>
      )}

      {faq.length > 0 && (
        <section className="px-6 py-12 border-t border-ink/8">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-2xl md:text-3xl text-ink mb-6">Perguntas frequentes</h2>
            <div className="divide-y divide-ink/10 border-y border-ink/10">
              {faq.map((f, i) => (
                <details key={i} className="group py-4">
                  <summary className="cursor-pointer list-none flex items-start justify-between gap-4 text-ink font-medium">
                    <span>{f.question}</span><span aria-hidden className="text-ink/40 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className="mt-3 text-ink/75 leading-relaxed">{f.answer}</div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {d.related.length > 0 && (
        <section className="px-6 py-12 border-t border-ink/8 bg-ink/[0.02]">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-serif text-2xl mb-6">Outras seleções</h2>
            <div className="flex flex-wrap gap-3">
              {d.related.map((r) => (
                <Link key={r.slug} to="/imoveis-alphaville/$slug" params={{ slug: r.slug }} className="border border-ink/15 px-4 py-3 text-sm hover:border-ink hover:bg-ink hover:text-canvas transition-colors">{r.title}</Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <ResolvedCta
        contentType="lista"
        keys={[listingCtaKey(d.page as { purpose: string; filters?: { types?: string[] } })]}
        vars={{ titulo: d.page.h1 ?? d.page.title }}
      />

      <ListingSelections title="Outras seleções de imóveis" />

      <InstitutionalBlock />
    </SiteLayout>
  );
}

/** Regra de CTA da lista pronta: comercial (sala, loja, galpão…) ou residencial, venda ou aluguel. */
function listingCtaKey(p: { purpose: string; filters?: { types?: string[] } }) {
  const types = p.filters?.types ?? [];
  const comercial = types.length > 0 && types.every((t) => /sala|loja|galp|pr[eé]dio|comercial|ponto/i.test(t));
  return `lista:${comercial ? "comercial" : "residencial"}-${p.purpose === "rent" ? "aluguel" : "venda"}`;
}
