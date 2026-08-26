import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { InstitutionalBlock } from "@/components/section-page";
import { OpportunityCard } from "@/components/premium-cards/opportunity-card";
import { listOpportunities, type OpportunityDTO } from "@/lib/opportunities.functions";
import { OpportunitySubscribeForm } from "@/components/opportunities/opportunity-subscribe-form";

const SITE_URL = "https://alphaville-vantage.lovable.app";

const TITLE = "Vitrine de Oportunidades — S.A Imóveis Alphaville";
const DESCRIPTION =
  "Imóveis em Alphaville, Tamboré, Barueri e Santana de Parnaíba selecionados pela equipe S.A Imóveis. Cada seleção traz o motivo declarado e a data da última apuração.";

type LoaderData = { items: OpportunityDTO[]; total: number; updatedAt: string | null };

export const Route = createFileRoute("/oportunidades/")({
  loader: () => listOpportunities({ data: {} }),
  head: ({ loaderData }) => {
    const data = loaderData as LoaderData | undefined;
    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Vitrine de Oportunidades S.A Imóveis",
      numberOfItems: data?.items.length ?? 0,
      itemListElement: (data?.items ?? []).map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/imoveis/${item.slug}`,
        name: item.title,
      })),
    };
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:url", content: `${SITE_URL}/oportunidades` },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/oportunidades` }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(itemList) }],
    };
  },
  component: OpportunitiesPage,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-6 py-24 text-sm text-red-600">{error.message}</div>
    </SiteLayout>
  ),
});

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const FAQ = [
  {
    q: "Como um imóvel entra nesta vitrine?",
    a: "Nossa equipe avalia o acervo e seleciona imóveis cujo posicionamento de preço se destaca frente aos comparáveis da mesma região e tipologia. A seleção é manual, tem validade e é revista periodicamente — imóveis vencidos saem da vitrine automaticamente.",
  },
  {
    q: "O que significam as mensagens sobre preço?",
    a: "Toda sinalização de preço aqui é gerada pelos dados do próprio anúncio, com data. Quando você lê “preço reduzido em R$ X em DD/MM”, isso corresponde a uma alteração registrada no histórico do imóvel — não é uma estimativa nem uma opinião comercial.",
  },
  {
    q: "Com que frequência a vitrine é atualizada?",
    a: "Sempre que a curadoria muda. A data da última atualização aparece no topo desta página, e cada imóvel guarda a data em que entrou na seleção.",
  },
  {
    q: "Posso receber as oportunidades em primeira mão?",
    a: "Sim. Investidores e corretores parceiros podem entrar na lista pelo formulário nesta página e escolher receber por e-mail, por WhatsApp ou pelos dois. Você sai da lista quando quiser.",
  },
];

function OpportunitiesPage() {
  const { items, updatedAt } = Route.useLoaderData() as LoaderData;
  const [purpose, setPurpose] = useState("all");
  const [city, setCity] = useState("all");

  const cities = useMemo(
    () =>
      [...new Set(items.map((i) => i.city).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [items],
  );

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (purpose === "all" || i.purpose === purpose || (purpose === "sale" && i.price_sale)) &&
          (city === "all" || i.city === city),
      ),
    [items, purpose, city],
  );

  const select =
    "border border-[#0D0D0D]/15 bg-white px-3 py-2 text-sm text-[#1A1A1A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2DA00]";

  return (
    <SiteLayout>
      {/* ---------------------------------------------------------- abertura */}
      <section className="bg-[#0D0D0D] px-6 pb-20 pt-20 text-[#EAEAE6]">
        <div className="mx-auto max-w-7xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#F2DA00]">
            Curadoria S.A Imóveis
          </p>
          <h1 className="font-display mt-4 max-w-[20ch] text-4xl font-medium leading-[1.05] tracking-tight text-balance md:text-6xl">
            Vitrine de Oportunidades
          </h1>
          <p className="mt-8 max-w-[58ch] text-lg leading-relaxed text-[#EAEAE6]/75 text-pretty">
            Não é a nossa lista inteira de imóveis — é a parte dela que a equipe olhou de perto e
            decidiu colocar aqui, com o motivo declarado em cada anúncio.
          </p>
          <p className="mt-6 text-[12px] uppercase tracking-[0.16em] text-[#EAEAE6]/45">
            {items.length} {items.length === 1 ? "imóvel selecionado" : "imóveis selecionados"}
            {updatedAt ? ` · Última atualização em ${longDate(updatedAt)}` : null}
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------ filtros */}
      <section className="border-b border-[#0D0D0D]/10 bg-[#EAEAE6] px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1A1A1A]/50">
            Filtrar
          </label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className={select}
            aria-label="Modalidade"
          >
            <option value="all">Todas as modalidades</option>
            <option value="sale">Venda</option>
            <option value="rent">Locação</option>
          </select>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={select}
            aria-label="Cidade"
          >
            <option value="all">Todas as cidades</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* -------------------------------------------------------------- cards */}
      <section className="bg-[#EAEAE6] px-6 py-16">
        <div className="mx-auto max-w-7xl">
          {filtered.length ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {filtered.map((item, i) => (
                <OpportunityCard key={item.id} item={item} size="large" priority={i < 2} />
              ))}
            </div>
          ) : (
            <div className="border border-[#0D0D0D]/12 bg-white px-8 py-16 text-center">
              <p className="font-display text-2xl text-[#0D0D0D]">
                Nenhuma oportunidade nesse recorte agora
              </p>
              <p className="mt-3 text-sm text-[#1A1A1A]/60">
                A vitrine muda conforme a curadoria avança. Enquanto isso, o acervo completo
                continua disponível.
              </p>
              <Link
                to={"/imoveis" as never}
                className="mt-8 inline-flex items-center gap-2 bg-[#F2DA00] px-7 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0D0D0D] transition hover:brightness-95"
              >
                Ver todos os imóveis
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------- captação */}
      <section id="lista" className="scroll-mt-20 bg-[#0D0D0D] px-6 py-20 text-[#EAEAE6]">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#F2DA00]">
              Lista de oportunidades
            </p>
            <h2 className="font-display mt-4 max-w-[16ch] text-3xl leading-tight tracking-tight text-balance md:text-4xl">
              Receba antes de entrar no site
            </h2>
            <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-[#EAEAE6]/70">
              Investidores e corretores parceiros recebem as novas seleções assim que a curadoria
              fecha. Sem disparo diário: só quando entra imóvel novo na vitrine.
            </p>
          </div>
          <div className="lg:col-span-7">
            <OpportunitySubscribeForm tone="dark" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- como funciona */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#1A1A1A]/45">
              Como esta vitrine funciona
            </p>
            <h2 className="font-display mt-4 text-3xl leading-tight tracking-tight text-[#0D0D0D]">
              Curadoria com critério declarado
            </h2>
            <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-[#1A1A1A]/70">
              A vitrine tem teto de oito imóveis publicados ao mesmo tempo. É proposital: uma
              seleção que aceita tudo deixa de ser seleção. Cada entrada tem validade, e toda
              sinalização de preço vem do histórico do próprio anúncio.
            </p>
          </div>

          <div className="lg:col-span-7">
            <dl className="divide-y divide-[#0D0D0D]/10 border-t border-[#0D0D0D]/10">
              {FAQ.map((f) => (
                <div key={f.q} className="py-6">
                  <dt className="font-display text-[19px] leading-snug text-[#0D0D0D]">{f.q}</dt>
                  <dd className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-[#1A1A1A]/70">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <InstitutionalBlock />
    </SiteLayout>
  );
}
