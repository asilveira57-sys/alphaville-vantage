import { createFileRoute, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import logoAsset from "@/assets/logo-sa-imoveis-amarela.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { listingCode, listingPrices } from "@/lib/property-listing";
import { getPublicProposal, registerProposalView, type PublicProposal } from "@/lib/proposals.functions";

// Página que o cliente recebe do corretor. Fora do Google (noindex) e do sitemap.
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
    <Shell>
      <div className="px-6 py-24 text-center">
        <h1 className="font-serif text-3xl text-white mb-3">Proposta não encontrada</h1>
        <p className="text-sm text-white/60 mb-8">O link pode estar incompleto. Fale com a nossa equipe.</p>
        <a href="https://wa.me/5511995515053" className="inline-flex items-center gap-2 bg-[#F2DA00] text-[#0D0D0D] px-6 py-3 text-xs uppercase tracking-widest font-semibold">
          <MessageCircle className="h-4 w-4" /> Falar com a S.A
        </a>
      </div>
    </Shell>
  ),
  component: ProposalPage,
});

const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
const firstName = (s: string) => s.trim().split(/\s+/)[0] ?? s;

function wa(number: string, text: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <img src={logoAsset.url} alt="S.A Imóveis Alphaville" className="h-9 w-auto" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">CRECI 26075-J</span>
        </div>
      </header>
      {children}
    </div>
  );
}

function ProposalPage() {
  const p = Route.useLoaderData() as PublicProposal;
  const { token } = Route.useParams();
  const viewFn = useServerFn(registerProposalView);

  // Conta a abertura (não conta quem está logado no admin).
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) void viewFn({ data: { token } }).catch(() => {});
    });
  }, [token, viewFn]);

  const b = p.broker;
  const talk = wa(b.whatsapp, `Olá ${firstName(b.name)}! Vi a seleção de imóveis que você me mandou.`);

  return (
    <Shell>
      {/* Capa do corretor */}
      <section className="max-w-3xl mx-auto px-5 pt-10 pb-8 text-center">
        <div className="mx-auto h-32 w-32 rounded-full overflow-hidden border-2 border-[#F2DA00] bg-white/10">
          {b.photo_url && <img src={b.photo_url} alt={b.name} className="h-full w-full object-cover" />}
        </div>
        <h1 className="mt-4 font-serif text-3xl">{b.name}</h1>
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/60 mt-1">
          {b.role_title ?? "Corretor"}
          {b.creci ? ` · CRECI ${b.creci}` : ""}
        </p>
        {b.tagline && <p className="text-sm text-white/70 mt-2 italic">{b.tagline}</p>}

        <div className="mt-8 text-left border-l-2 border-[#F2DA00] pl-4">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#F2DA00] mb-2">
            Seleção para {p.client_name}
            {!p.expired && ` · válida até ${fmtDate(p.expires_at)}`}
          </p>
          {p.expired ? (
            <p className="text-white/85 leading-relaxed">
              Esta seleção expirou. Fale comigo para receber as opções atualizadas.
            </p>
          ) : (
            p.message && <p className="text-white/85 leading-relaxed whitespace-pre-line">{p.message}</p>
          )}
        </div>
      </section>

      {/* Imóveis */}
      {!p.expired && (
        <section className="bg-[#EAEAE6] text-[#0D0D0D]">
          <div className="max-w-3xl mx-auto px-5 py-10 space-y-6">
            {p.items.map(({ property: it, broker_note, price_changed, available }, idx) => {
              const price = listingPrices(it.price_sale, it.price_rent, "", it.purpose);
              const code = listingCode(it.internal_code);
              const area = it.area_useful || it.area_built || it.area_total;
              const facts = [
                it.bedrooms ? `${it.bedrooms} dorm.` : null,
                it.parking ? `${it.parking} vaga${it.parking > 1 ? "s" : ""}` : null,
                area ? `${Number(area).toLocaleString("pt-BR")} m²` : null,
              ].filter(Boolean);
              const img = it.large_image_url || it.card_image_url;
              return (
                <article key={it.id} className={`bg-white shadow-sm overflow-hidden ${available ? "" : "opacity-50"}`}>
                  <div className="relative aspect-[16/10] bg-[#0D0D0D]/10">
                    {img && <img src={img} alt={it.title} loading={idx < 2 ? "eager" : "lazy"} className="h-full w-full object-cover" />}
                    <span className="absolute top-3 left-3 bg-[#0D0D0D] text-white text-[10px] uppercase tracking-widest px-2 py-1">
                      {idx + 1} · {price.label}
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#0D0D0D]/55">
                      {[it.condominium_name, it.neighborhood, it.city].filter(Boolean).join(" · ")}
                    </p>
                    <h2 className="font-serif text-xl mt-1 leading-snug">{it.title.split(/\s+[–—-]\s+/)[0]}</h2>
                    <div className="mt-3 flex items-baseline gap-3 flex-wrap">
                      <span className="text-2xl font-semibold">{price.primary}</span>
                      {price_changed && available && (
                        <span className="text-[10px] uppercase tracking-widest bg-[#F2DA00] px-2 py-0.5">Valor atualizado</span>
                      )}
                    </div>
                    {facts.length > 0 && <p className="text-sm text-[#0D0D0D]/70 mt-1">{facts.join(" · ")}</p>}
                    {broker_note && (
                      <p className="mt-4 text-sm bg-[#F2DA00]/25 border-l-2 border-[#F2DA00] px-3 py-2">
                        <span className="font-medium">{firstName(b.name)}:</span> {broker_note}
                      </p>
                    )}
                    {code && <p className="text-[11px] text-[#0D0D0D]/50 mt-3">Cód. {code}</p>}
                    {available ? (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <a
                          href={`/imoveis/${it.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-center border border-[#0D0D0D] px-3 py-2.5 text-[11px] uppercase tracking-widest font-medium"
                        >
                          Ver detalhes
                        </a>
                        <a
                          href={wa(b.whatsapp, `Olá ${firstName(b.name)}! Vi a seleção que você me mandou e quero visitar o imóvel${code ? ` Cód. ${code}` : ""}.`)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-center bg-[#0D0D0D] text-white px-3 py-2.5 text-[11px] uppercase tracking-widest font-medium"
                        >
                          Quero visitar
                        </a>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm font-medium">Não está mais disponível.</p>
                    )}
                  </div>
                </article>
              );
            })}
            <p className="text-xs text-[#0D0D0D]/60 text-center pt-2">
              Valores e disponibilidade sujeitos a confirmação com a imobiliária.
            </p>
          </div>
        </section>
      )}

      <footer className="max-w-3xl mx-auto px-5 pt-10 pb-28 text-center text-[11px] text-white/45 leading-relaxed">
        S.A Imóveis Alphaville · CRECI 26075-J · CNPJ 13.349.385/0001-49
        <br />
        Av. Marcos Penteado de Ulhôa Rodrigues, 4053 – Loja 4, Tamboré · Santana de Parnaíba/SP
      </footer>

      {/* Botão fixo */}
      <div className="fixed bottom-0 inset-x-0 p-3 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/95 to-transparent">
        <a
          href={talk}
          target="_blank"
          rel="noreferrer"
          className="max-w-3xl mx-auto flex items-center justify-center gap-2 bg-[#25D366] text-white py-3.5 text-xs uppercase tracking-widest font-semibold"
        >
          <MessageCircle className="h-4 w-4" /> Falar com {firstName(b.name)}
        </a>
      </div>
    </Shell>
  );
}
