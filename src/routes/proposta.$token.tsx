import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, MessageCircle, Table2 } from "lucide-react";
import logoAsset from "@/assets/logo-sa-imoveis-amarela.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { listingCode } from "@/lib/property-listing";
import { fichaPrices, fichaRows, iptuMonthly, mainArea, placeLine, shortTitle } from "@/lib/property-ficha";
import { getPublicProposal, registerProposalView, type PublicProposal } from "@/lib/proposals.functions";

// Página que o cliente recebe do corretor. Fora do Google (noindex) e do sitemap.
// Computador: corretor como figura na coluna da esquerda, "apresentando" a seleção à direita.
export const Route = createFileRoute("/proposta/$token")({
  loader: async ({ params }) => {
    const p = await getPublicProposal({ data: { token: params.token } });
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Seleção de imóveis para ${loaderData.client_name} — S.A Imóveis Alphaville` : "Proposta — S.A Imóveis Alphaville" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
      { name: "description", content: loaderData ? `${loaderData.broker.name} separou imóveis para você em Alphaville e região.` : "" },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col items-center justify-center px-6 text-center">
      <img src={logoAsset.url} alt="S.A Imóveis Alphaville" className="h-10 w-auto mb-10" />
      <h1 className="font-serif text-3xl mb-3">Proposta não encontrada</h1>
      <p className="text-sm text-white/60 mb-8">O link pode estar incompleto. Fale com a nossa equipe.</p>
      <a href="https://wa.me/5511995515053" className="inline-flex items-center gap-2 bg-[#F2DA00] text-[#0D0D0D] px-6 py-3 text-xs uppercase tracking-widest font-semibold">
        <MessageCircle className="h-4 w-4" /> Falar com a S.A
      </a>
    </div>
  ),
  component: ProposalPage,
});

const Y = "#F2DA00";
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
const firstName = (s: string) => s.trim().split(/\s+/)[0] ?? s;
const wa = (n: string, text: string) => `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
const short = (n: number) => (n >= 1_000_000 ? `R$ ${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi` : n >= 1000 ? `R$ ${Math.round(n / 1000)} mil` : brl(n));

type Item = PublicProposal["items"][number];

function ProposalPage() {
  const p = Route.useLoaderData() as PublicProposal;
  const { token } = Route.useParams();
  const viewFn = useServerFn(registerProposalView);
  const [view, setView] = useState<"cards" | "tabela">("cards");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) void viewFn({ data: { token } }).catch(() => {});
    });
  }, [token, viewFn]);

  const b = p.broker;
  const visitText = (code: string | null) =>
    `Olá ${firstName(b.name)}! Vi a seleção que você me mandou e quero visitar o imóvel${code ? ` Cód. ${code}` : ""}.`;
  const talk = wa(b.whatsapp, `Olá ${firstName(b.name)}! Vi a seleção de imóveis que você me mandou.`);
  const available = p.items.filter((i) => i.available);

  const stats = useMemo(() => {
    const sales = available.map((i) => i.property).filter((x) => x.purpose !== "rent" && Number(x.price_sale) > 0).map((x) => Number(x.price_sale));
    const rents = available.map((i) => i.property).filter((x) => x.purpose !== "sale" && Number(x.price_rent) > 0).map((x) => Number(x.price_rent));
    const condos = [...new Set(available.map((i) => i.property.condominium_name).filter(Boolean))] as string[];
    return {
      sale: sales.length ? [Math.min(...sales), Math.max(...sales)] : null,
      rent: rents.length ? [Math.min(...rents), Math.max(...rents)] : null,
      condos,
    };
  }, [available]);

  const figure = b.figure_url;

  return (
    <div className="min-h-screen bg-[#EAEAE6] text-[#0D0D0D] lg:grid lg:grid-cols-[minmax(340px,30%)_1fr]">
      {/* ===== Coluna do corretor (computador) / capa (celular) ===== */}
      <aside className="relative bg-[#0D0D0D] text-white lg:sticky lg:top-0 lg:h-screen overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 55% 75%, rgba(242,218,0,0.18), transparent 60%)` }} />
        <div className="relative z-10 px-6 pt-6 flex items-center justify-between">
          <img src={logoAsset.url} alt="S.A Imóveis Alphaville" className="h-9 w-auto" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">CRECI 26075-J</span>
        </div>

        {/* Balão de fala com a mensagem */}
        <div className="relative z-20 px-6 mt-6 lg:mt-10">
          <div className="relative bg-white text-[#0D0D0D] px-5 py-4 shadow-xl max-w-md">
            <p className="text-[10px] uppercase tracking-[0.25em] mb-2" style={{ color: "#8a7a00" }}>
              Seleção para {p.client_name}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {p.expired ? "Esta seleção expirou. Fale comigo para receber as opções atualizadas." : p.message || `Separei estes imóveis para você, ${firstName(p.client_name)}.`}
            </p>
            {/* ponta do balão: para baixo no celular, para a direita no computador */}
            <span className="absolute -bottom-2 left-10 h-4 w-4 rotate-45 bg-white lg:hidden" />
            <span className="hidden lg:block absolute top-8 -right-2 h-4 w-4 rotate-45 bg-white" />
          </div>
        </div>

        {/* Figura do corretor */}
        <div className="relative z-10 flex items-end gap-4 px-6 pt-4 lg:absolute lg:inset-x-0 lg:bottom-0 lg:px-0 lg:pt-0">
          {figure ? (
            <img
              src={figure}
              alt={b.name}
              className="h-56 w-auto object-contain object-bottom lg:h-[62vh] lg:mx-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
            />
          ) : (
            <div className="h-24 w-24 lg:h-40 lg:w-40 lg:mx-auto lg:mb-40 rounded-full overflow-hidden border-2 shrink-0 mb-4" style={{ borderColor: Y }}>
              {b.photo_url && <img src={b.photo_url} alt={b.name} className="h-full w-full object-cover" />}
            </div>
          )}
          {/* Nome no celular, ao lado da figura */}
          <div className="pb-6 lg:hidden">
            <p className="font-serif text-2xl leading-tight">{b.name}</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60 mt-1">
              {b.role_title ?? "Corretor"}
              {b.creci ? ` · CRECI ${b.creci}` : ""}
            </p>
          </div>
        </div>

        {/* Cartão do corretor (computador) */}
        <div className="hidden lg:block absolute z-20 inset-x-6 bottom-6">
          <div className="bg-[#0D0D0D]/85 backdrop-blur border border-white/10 px-5 py-4">
            <p className="font-serif text-2xl leading-tight">{b.name}</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60 mt-1">
              {b.role_title ?? "Corretor"}
              {b.creci ? ` · CRECI ${b.creci}` : ""}
            </p>
            <a href={talk} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 text-xs uppercase tracking-widest font-semibold">
              <MessageCircle className="h-4 w-4" /> Falar com {firstName(b.name)}
            </a>
          </div>
        </div>
      </aside>

      {/* ===== Conteúdo ===== */}
      <main className="pb-28 lg:pb-16">
        {!p.expired && (
          <>
            <header className="px-5 lg:px-12 pt-8 lg:pt-14">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#0D0D0D]/50">S.A Imóveis Alphaville · válida até {fmtDate(p.expires_at)}</p>
              <h1 className="font-serif text-3xl lg:text-5xl mt-2 leading-tight">
                {available.length} {available.length === 1 ? "imóvel selecionado" : "imóveis selecionados"} para {firstName(p.client_name)}
              </h1>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {stats.sale && (
                  <span className="bg-white px-3 py-1.5">
                    Venda: {stats.sale[0] === stats.sale[1] ? short(stats.sale[0]) : `${short(stats.sale[0])} a ${short(stats.sale[1])}`}
                  </span>
                )}
                {stats.rent && (
                  <span className="bg-white px-3 py-1.5">
                    Locação: {stats.rent[0] === stats.rent[1] ? brl(stats.rent[0]) : `${brl(stats.rent[0])} a ${brl(stats.rent[1])}`}/mês
                  </span>
                )}
                {stats.condos.length > 0 && stats.condos.length <= 4 && <span className="bg-white px-3 py-1.5">{stats.condos.join(" · ")}</span>}
              </div>

              <div className="mt-6 inline-flex border border-[#0D0D0D]/20">
                <button
                  type="button"
                  onClick={() => setView("cards")}
                  className={`flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-widest ${view === "cards" ? "bg-[#0D0D0D] text-white" : ""}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Fichas
                </button>
                <button
                  type="button"
                  onClick={() => setView("tabela")}
                  className={`flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-widest ${view === "tabela" ? "bg-[#0D0D0D] text-white" : ""}`}
                >
                  <Table2 className="h-3.5 w-3.5" /> Comparar
                </button>
              </div>
            </header>

            <section className="px-5 lg:px-12 mt-6">
              {view === "cards" ? (
                <div className="space-y-5">
                  {p.items.map((it, idx) => (
                    <Card key={it.property.id} it={it} idx={idx} brokerFirst={firstName(b.name)} visitHref={wa(b.whatsapp, visitText(listingCode(it.property.internal_code)))} />
                  ))}
                </div>
              ) : (
                <CompareTable items={p.items} visit={(code) => wa(b.whatsapp, visitText(code))} />
              )}
              <p className="text-xs text-[#0D0D0D]/55 text-center pt-6">
                Valores e disponibilidade sujeitos a confirmação com a imobiliária. IPTU mostrado por mês.
              </p>
            </section>
          </>
        )}

        <footer className="px-5 lg:px-12 pt-10 text-center lg:text-left text-[11px] text-[#0D0D0D]/50 leading-relaxed">
          S.A Imóveis Alphaville · CRECI 26075-J · CNPJ 13.349.385/0001-49
          <br />
          Av. Marcos Penteado de Ulhôa Rodrigues, 4053 – Loja 4, Tamboré · Santana de Parnaíba/SP
        </footer>
      </main>

      {/* Botão fixo (celular) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 p-3 bg-gradient-to-t from-[#EAEAE6] via-[#EAEAE6]/95 to-transparent">
        <a href={talk} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-3.5 text-xs uppercase tracking-widest font-semibold">
          <MessageCircle className="h-4 w-4" /> Falar com {firstName(b.name)}
        </a>
      </div>
    </div>
  );
}

function Card({ it, idx, brokerFirst, visitHref }: { it: Item; idx: number; brokerFirst: string; visitHref: string }) {
  const pr = it.property;
  const img = pr.large_image_url || pr.card_image_url;
  const rows = fichaRows(pr);
  const code = listingCode(pr.internal_code);
  return (
    <article className={`bg-white shadow-sm overflow-hidden md:grid md:grid-cols-[minmax(260px,42%)_1fr] ${it.available ? "" : "opacity-50"}`}>
      <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[260px] bg-[#0D0D0D]/10">
        {img && <img src={img} alt={pr.title} loading={idx < 2 ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover" />}
        <span className="absolute top-3 left-3 bg-[#0D0D0D] text-white text-[11px] font-semibold px-2.5 py-1">{idx + 1}</span>
        {it.price_changed && it.available && (
          <span className="absolute top-3 right-3 text-[10px] uppercase tracking-widest bg-[#F2DA00] px-2 py-1">Valor atualizado</span>
        )}
      </div>
      <div className="p-5 lg:p-6 flex flex-col">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#0D0D0D]/55">{placeLine(pr)}</p>
        <h2 className="font-serif text-xl lg:text-2xl mt-1 leading-snug">{shortTitle(pr)}</h2>

        {/* Ficha */}
        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          {rows.map((r) => (
            <div key={r.label} className={r.label === "Venda" || r.label === "Locação" ? "col-span-2 sm:col-span-1" : ""}>
              <dt className="text-[10px] uppercase tracking-widest text-[#0D0D0D]/50">{r.label}</dt>
              <dd className={r.label === "Venda" || r.label === "Locação" ? "text-lg font-semibold" : "text-sm font-medium"}>{r.value}</dd>
            </div>
          ))}
        </dl>

        {it.broker_note && (
          <p className="mt-4 text-sm bg-[#F2DA00]/25 border-l-2 border-[#F2DA00] px-3 py-2">
            <span className="font-medium">{brokerFirst}:</span> {it.broker_note}
          </p>
        )}

        <div className="mt-auto pt-4">
          {code && <p className="text-[11px] text-[#0D0D0D]/45 mb-3">Cód. {code}</p>}
          {it.available ? (
            <div className="grid grid-cols-2 gap-2">
              <a href={`/imoveis/${pr.slug}`} target="_blank" rel="noreferrer" className="text-center border border-[#0D0D0D] px-3 py-2.5 text-[11px] uppercase tracking-widest font-medium">
                Fotos e detalhes
              </a>
              <a href={visitHref} target="_blank" rel="noreferrer" className="text-center bg-[#0D0D0D] text-white px-3 py-2.5 text-[11px] uppercase tracking-widest font-medium">
                Quero visitar
              </a>
            </div>
          ) : (
            <p className="text-sm font-medium">Não está mais disponível.</p>
          )}
        </div>
      </div>
    </article>
  );
}

function CompareTable({ items, visit }: { items: Item[]; visit: (code: string | null) => string }) {
  const th = "px-3 py-2.5 text-left text-[10px] uppercase tracking-widest font-medium text-white/80 whitespace-nowrap";
  const td = "px-3 py-3 whitespace-nowrap align-middle";
  return (
    <div className="overflow-x-auto bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-[#0D0D0D]">
          <tr>
            <th className={th}>#</th>
            <th className={th}>Imóvel</th>
            <th className={th}>Venda</th>
            <th className={th}>Locação</th>
            <th className={th}>Condomínio</th>
            <th className={th}>IPTU/mês</th>
            <th className={th}>Área</th>
            <th className={th}>Dorm.</th>
            <th className={th}>Vagas</th>
            <th className={th}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => {
            const p = it.property;
            const pr = fichaPrices(p);
            const area = mainArea(p);
            const iptu = iptuMonthly(p);
            const code = listingCode(p.internal_code);
            const img = p.card_image_url || p.large_image_url;
            return (
              <tr key={p.id} className={`border-t border-[#0D0D0D]/10 ${idx % 2 ? "bg-[#0D0D0D]/[0.02]" : ""} ${it.available ? "" : "opacity-40"}`}>
                <td className={`${td} font-semibold`}>{idx + 1}</td>
                <td className={td}>
                  <a href={`/imoveis/${p.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 group">
                    <span className="h-10 w-14 bg-[#0D0D0D]/10 overflow-hidden shrink-0">{img && <img src={img} alt="" loading="lazy" className="h-full w-full object-cover" />}</span>
                    <span>
                      <span className="block font-medium group-hover:underline">{p.condominium_name || p.neighborhood || shortTitle(p)}</span>
                      <span className="block text-[11px] text-[#0D0D0D]/50">
                        {p.property_type ?? "imóvel"}
                        {code ? ` · ${code}` : ""}
                      </span>
                    </span>
                  </a>
                </td>
                <td className={`${td} font-semibold`}>{pr.sale ?? "—"}</td>
                <td className={td}>{pr.rent ?? "—"}</td>
                <td className={td}>{Number(p.condo_fee) > 0 ? brl(Number(p.condo_fee)) : "—"}</td>
                <td className={td}>{iptu ? brl(iptu) : "—"}</td>
                <td className={td}>{area ? `${Number(area.value).toLocaleString("pt-BR")} m²` : "—"}</td>
                <td className={td}>
                  {Number(p.bedrooms) > 0 ? p.bedrooms : "—"}
                  {Number(p.suites) > 0 && Number(p.suites) <= Number(p.bedrooms) ? <span className="text-[#0D0D0D]/50"> ({p.suites}s)</span> : null}
                </td>
                <td className={td}>{Number(p.parking) > 0 ? p.parking : "—"}</td>
                <td className={td}>
                  {it.available ? (
                    <a href={visit(code)} target="_blank" rel="noreferrer" className="bg-[#0D0D0D] text-white px-3 py-2 text-[10px] uppercase tracking-widest">
                      Visitar
                    </a>
                  ) : (
                    <span className="text-[11px]">Indisponível</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
