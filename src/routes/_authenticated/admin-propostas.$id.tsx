import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { SiteLayout } from "@/components/site-layout";
import { AdminGate, AdminPageHeader } from "@/components/admin/admin-gate";
import { listingPrices } from "@/lib/property-listing";
import {
  getProposalForEdit,
  listBrokers,
  PROPOSAL_MAX_ITEMS,
  proposalWhatsappHref,
  saveProposal,
  searchPropertiesForProposal,
  type ProposalPropertyHit,
} from "@/lib/proposals.functions";

export const Route = createFileRoute("/_authenticated/admin-propostas/$id")({
  head: () => ({ meta: [{ title: "Admin · Proposta — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (
    <AdminGate>
      <EditorPage />
    </AdminGate>
  ),
});

type Item = { property: ProposalPropertyHit; broker_note: string };

const DEFAULT_MESSAGE =
  "Olá {cliente}! Separei estes imóveis pensando no que você me contou. Qualquer um que chamar sua atenção, me chama aqui que eu organizo a visita.";

const input = "w-full border border-ink/15 px-3 py-2.5 text-sm bg-transparent focus:outline-none focus:border-ink";

function facts(p: ProposalPropertyHit) {
  const area = p.area_useful || p.area_built || p.area_total;
  return [
    p.bedrooms ? `${p.bedrooms} dorm.` : null,
    p.parking ? `${p.parking} vaga${p.parking > 1 ? "s" : ""}` : null,
    area ? `${Number(area).toLocaleString("pt-BR")} m²` : null,
  ].filter(Boolean).join(" · ");
}

function Thumb({ p }: { p: ProposalPropertyHit }) {
  const src = p.card_image_url || p.large_image_url;
  return (
    <div className="h-14 w-20 shrink-0 bg-ink/10 overflow-hidden">
      {src && <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />}
    </div>
  );
}

function EditorPage() {
  const { id } = Route.useParams();
  const isNew = id === "nova";
  const navigate = useNavigate();
  const brokersFn = useServerFn(listBrokers);
  const getFn = useServerFn(getProposalForEdit);
  const searchFn = useServerFn(searchPropertiesForProposal);
  const saveFn = useServerFn(saveProposal);

  const brokersQ = useQuery({ queryKey: ["brokers"], queryFn: () => brokersFn() });
  const editQ = useQuery({ queryKey: ["proposal", id], queryFn: () => getFn({ data: { id } }), enabled: !isNew });

  const [brokerId, setBrokerId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [loaded, setLoaded] = useState(isNew);

  // Preenche ao editar.
  useEffect(() => {
    const p = editQ.data;
    if (!p || loaded) return;
    setBrokerId(p.broker_user_id);
    setClientName(p.client_name);
    setClientPhone(p.client_phone ?? "");
    setMessage(p.message ?? "");
    setItems(p.items.map((i) => ({ property: i.property, broker_note: i.broker_note ?? "" })));
    setLoaded(true);
  }, [editQ.data, loaded]);

  // Corretor padrão: o próprio usuário, se tiver perfil.
  const activeBrokers = (brokersQ.data?.brokers ?? []).filter((b) => b.active);
  useEffect(() => {
    if (!isNew || brokerId || !brokersQ.data) return;
    const mine = activeBrokers.find((b) => b.user_id === brokersQ.data.me);
    setBrokerId(mine?.user_id ?? activeBrokers[0]?.user_id ?? "");
  }, [brokersQ.data, isNew, brokerId, activeBrokers]);

  // Busca com pausa de digitação.
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  const resultsQ = useQuery({
    queryKey: ["proposalSearch", term],
    queryFn: () => searchFn({ data: { q: term } }),
    enabled: term.length >= 2,
  });

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: isNew ? null : id,
          broker_user_id: brokerId,
          client_name: clientName,
          client_phone: clientPhone || null,
          message: message.replace(/\{cliente\}/g, clientName.trim().split(" ")[0] || "").trim() || null,
          items: items.map((i) => ({ property_id: i.property.id, broker_note: i.broker_note || null })),
        },
      }),
  });

  const add = (p: ProposalPropertyHit) => {
    if (items.some((i) => i.property.id === p.id) || items.length >= PROPOSAL_MAX_ITEMS) return;
    setItems([...items, { property: p, broker_note: "" }]);
  };
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
  };

  if (!isNew && editQ.isLoading) {
    return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Carregando…</div></SiteLayout>;
  }

  // Tela de sucesso
  if (save.data) {
    const broker = activeBrokers.find((b) => b.user_id === brokerId);
    const wa = proposalWhatsappHref({
      client_phone: clientPhone || null,
      client_name: clientName,
      broker_name: broker?.display_name ?? "a equipe",
      items: items.length,
      token: save.data.token,
    });
    return (
      <SiteLayout>
        <div className="max-w-xl mx-auto px-6 py-20 text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Proposta salva</p>
          <h1 className="font-serif text-3xl text-ink mb-6">Pronta para enviar a {clientName}</h1>
          <div className="border border-ink/15 px-3 py-2 text-xs break-all mb-6 bg-white/50">{save.data.url}</div>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={wa} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white px-5 py-3 text-xs uppercase tracking-widest font-medium">
              Enviar no WhatsApp
            </a>
            <button type="button" onClick={() => navigator.clipboard.writeText(save.data!.url)} className="border border-ink px-5 py-3 text-xs uppercase tracking-widest">
              Copiar link
            </button>
            <a href={save.data.url} target="_blank" rel="noreferrer" className="border border-ink px-5 py-3 text-xs uppercase tracking-widest">
              Ver como o cliente
            </a>
          </div>
          <Link to="/admin-propostas" className="inline-block mt-10 text-xs uppercase tracking-widest text-muted-foreground hover:text-ink">
            ← Voltar às propostas
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const noBrokers = brokersQ.isSuccess && activeBrokers.length === 0;

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-14">
        <AdminPageHeader eyebrow="Propostas" title={isNew ? "Nova proposta" : "Editar proposta"}>
          <Link to="/admin-propostas" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-ink">← Voltar</Link>
        </AdminPageHeader>

        {noBrokers && (
          <p className="mb-8 border border-amber-400/60 bg-amber-50/60 p-4 text-sm">
            Cadastre primeiro o corretor com foto, CRECI e WhatsApp em{" "}
            <Link to="/admin-corretores" className="underline">Leads → Corretores</Link>.
          </p>
        )}
        {(brokersQ.error || editQ.error) && (
          <p className="mb-6 text-sm text-red-600">{((brokersQ.error || editQ.error) as Error).message}</p>
        )}

        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10">
          {/* Coluna 1: cliente e mensagem */}
          <section className="space-y-4">
            <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">1. Corretor e cliente</h2>
            <select value={brokerId} onChange={(e) => setBrokerId(e.target.value)} className={input}>
              <option value="">Corretor responsável…</option>
              {activeBrokers.map((b) => <option key={b.user_id} value={b.user_id}>{b.display_name}</option>)}
            </select>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" className={input} />
            <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="WhatsApp do cliente (opcional)" className={input} />

            <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground pt-4">3. Mensagem</h2>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={600} rows={4} className={input} />
            <p className="text-[11px] text-muted-foreground -mt-2">{"{cliente}"} vira o primeiro nome do cliente.</p>

            <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground pt-4">
              Seleção ({items.length}/{PROPOSAL_MAX_ITEMS})
            </h2>
            {items.length === 0 && <p className="text-sm text-muted-foreground">Busque e adicione imóveis ao lado.</p>}
            <ol className="space-y-2">
              {items.map((it, idx) => {
                const price = listingPrices(it.property.price_sale, it.property.price_rent, "", it.property.purpose).primary;
                return (
                  <li key={it.property.id} className="border border-ink/10 bg-white/50 p-2">
                    <div className="flex gap-3 items-center">
                      <span className="text-xs text-muted-foreground w-4 text-right">{idx + 1}</span>
                      <Thumb p={it.property} />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-medium text-ink truncate">{it.property.condominium_name || it.property.title}</div>
                        <div className="text-muted-foreground truncate">Cód. {it.property.internal_code} · {price}</div>
                      </div>
                      <div className="flex flex-col">
                        <button type="button" aria-label="Subir" onClick={() => move(idx, -1)} className="p-1 hover:bg-ink/5"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label="Descer" onClick={() => move(idx, 1)} className="p-1 hover:bg-ink/5"><ArrowDown className="h-3.5 w-3.5" /></button>
                      </div>
                      <button type="button" aria-label="Remover" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-1 text-red-600 hover:bg-red-50">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      value={it.broker_note}
                      maxLength={140}
                      onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, broker_note: e.target.value } : x)))}
                      placeholder="Nota do corretor (opcional): ex.: vista para a mata, aceita permuta"
                      className="mt-2 w-full border border-ink/10 px-2 py-1.5 text-xs bg-transparent focus:outline-none focus:border-ink"
                    />
                  </li>
                );
              })}
            </ol>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => save.mutate()}
                disabled={save.isPending || !brokerId || clientName.trim().length < 2 || items.length === 0}
                className="bg-ink text-canvas px-6 py-3 text-xs uppercase tracking-widest font-medium disabled:opacity-40"
              >
                {save.isPending ? "Salvando…" : isNew ? "Gerar proposta" : "Salvar alterações"}
              </button>
              {save.error && <p className="mt-3 text-xs text-red-600">{(save.error as Error).message}</p>}
              {!isNew && <button type="button" onClick={() => navigate({ to: "/admin-propostas" })} className="ml-4 text-xs uppercase tracking-widest text-muted-foreground">Cancelar</button>}
            </div>
          </section>

          {/* Coluna 2: busca */}
          <section>
            <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-4">2. Escolher imóveis</h2>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Código (AP07146), condomínio ou bairro"
              className={input}
            />
            <div className="mt-3 space-y-2 max-h-[70vh] overflow-y-auto">
              {resultsQ.isFetching && <p className="text-xs text-muted-foreground">Buscando…</p>}
              {resultsQ.error && <p className="text-xs text-red-600">{(resultsQ.error as Error).message}</p>}
              {(resultsQ.data ?? []).map((p) => {
                const chosen = items.some((i) => i.property.id === p.id);
                const full = items.length >= PROPOSAL_MAX_ITEMS;
                return (
                  <div key={p.id} className="flex gap-3 items-center border border-ink/10 p-2">
                    <Thumb p={p} />
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="font-medium text-ink truncate">{p.title}</div>
                      <div className="text-muted-foreground truncate">
                        Cód. {p.internal_code} · {listingPrices(p.price_sale, p.price_rent, "", p.purpose).primary}
                        {facts(p) ? ` · ${facts(p)}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={chosen || full}
                      onClick={() => add(p)}
                      className="border border-ink/20 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-ink/5 disabled:opacity-40"
                    >
                      {chosen ? "Na lista" : "Adicionar"}
                    </button>
                  </div>
                );
              })}
              {term.length >= 2 && resultsQ.isSuccess && resultsQ.data.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum imóvel ativo encontrado.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </SiteLayout>
  );
}
