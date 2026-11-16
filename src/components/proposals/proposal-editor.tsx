import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
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

// Editor de proposta usado no admin (/admin-propostas/$id) e no app do corretor (/corretor/propostas/$id).
// No celular a ordem é: cliente → buscar imóveis → seleção → mensagem → salvar (barra fixa).

type Item = { property: ProposalPropertyHit; broker_note: string };

// Filtro de tipo (grupos sobre properties.property_type).
const TYPE_OPTIONS: { id: string; label: string; types: string[] }[] = [
  { id: "all", label: "Todos os tipos", types: [] },
  { id: "apartamento", label: "Apartamento", types: ["apartamento"] },
  { id: "casa", label: "Casa", types: ["casa"] },
  { id: "terreno", label: "Terreno", types: ["terreno", "área"] },
  { id: "sala", label: "Sala / Loja", types: ["sala", "loja"] },
  { id: "galpao", label: "Galpão / Prédio", types: ["galpão", "prédio"] },
  { id: "rural", label: "Chácara / Fazenda", types: ["chácara", "fazenda"] },
];

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

export function ProposalEditor({
  id,
  backTo,
  lockToUserId,
  compact = false,
}: {
  id: string;
  /** Para onde voltar (lista de propostas). */
  backTo: "/admin-propostas" | "/corretor/propostas";
  /** App do corretor: a proposta é sempre do próprio usuário. */
  lockToUserId?: string;
  compact?: boolean;
}) {
  const isNew = id === "nova";
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
  const [purpose, setPurpose] = useState<"all" | "sale" | "rent">("all");
  const [typeId, setTypeId] = useState("all");
  const types = TYPE_OPTIONS.find((t) => t.id === typeId)?.types ?? [];
  const [minTxt, setMinTxt] = useState("");
  const [maxTxt, setMaxTxt] = useState("");
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
    if (lockToUserId) {
      if (brokerId !== lockToUserId && isNew) setBrokerId(lockToUserId);
      return;
    }
    if (!isNew || brokerId || !brokersQ.data) return;
    const mine = activeBrokers.find((b) => b.user_id === brokersQ.data.me);
    setBrokerId(mine?.user_id ?? activeBrokers[0]?.user_id ?? "");
  }, [brokersQ.data, isNew, brokerId, activeBrokers, lockToUserId]);

  // Busca com pausa de digitação.
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  const toNum = (t: string) => {
    const n = Number(t.replace(/\D/g, ""));
    return n > 0 ? n : null;
  };
  const [minV, setMinV] = useState<number | null>(null);
  const [maxV, setMaxV] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setMinV(toNum(minTxt));
      setMaxV(toNum(maxTxt));
    }, 450);
    return () => clearTimeout(t);
  }, [minTxt, maxTxt]);
  const hasFilter = term.length >= 2 || purpose !== "all" || typeId !== "all" || minV != null || maxV != null;
  const resultsQ = useQuery({
    queryKey: ["proposalSearch", term, purpose, typeId, minV, maxV],
    queryFn: () => searchFn({ data: { q: term, purpose, types, min: minV, max: maxV } }),
    enabled: hasFilter,
  });
  const priceFor = (p: ProposalPropertyHit) => {
    if (purpose === "rent" && p.price_rent) return `R$ ${Number(p.price_rent).toLocaleString("pt-BR")}/mês`;
    if (purpose === "sale" && p.price_sale) return `R$ ${Number(p.price_sale).toLocaleString("pt-BR")}`;
    return listingPrices(p.price_sale, p.price_rent, "", p.purpose).primary;
  };

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
  const addAll = () => {
    const room = PROPOSAL_MAX_ITEMS - items.length;
    const fresh = (resultsQ.data ?? []).filter((p) => !items.some((i) => i.property.id === p.id)).slice(0, room);
    setItems([...items, ...fresh.map((p) => ({ property: p, broker_note: "" }))]);
  };
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
  };

  if (!isNew && editQ.isLoading) {
    return <div className="px-6 py-16 text-sm text-muted-foreground">Carregando…</div>;
  }

  const broker = activeBrokers.find((b) => b.user_id === brokerId);

  // Tela de sucesso
  if (save.data) {
    const shareBase = {
      client_phone: clientPhone || null,
      client_name: clientName,
      broker_name: broker?.display_name ?? "a equipe",
      items: items.length,
      token: save.data.token,
    };
    const wa = proposalWhatsappHref(shareBase);
    const waResumo = proposalWhatsappHref(shareBase, items.map((i) => i.property));
    return (
      <div className="max-w-xl mx-auto px-5 py-14 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-3">Proposta salva</p>
        <h1 className="font-serif text-3xl text-ink mb-6">Pronta para enviar a {clientName}</h1>
        <div className="border border-ink/15 px-3 py-2 text-xs break-all mb-6 bg-white/50">{save.data.url}</div>
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3">
          <a href={waResumo} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white px-5 py-3.5 text-xs uppercase tracking-widest font-semibold">
            WhatsApp com resumo
          </a>
          <a href={wa} target="_blank" rel="noreferrer" className="border border-[#25D366] text-[#128C4B] px-5 py-3.5 text-xs uppercase tracking-widest font-semibold">
            WhatsApp só com o link
          </a>
          <button type="button" onClick={() => navigator.clipboard.writeText(save.data!.url)} className="border border-ink px-5 py-3.5 text-xs uppercase tracking-widest">
            Copiar link
          </button>
          <a href={save.data.url} target="_blank" rel="noreferrer" className="border border-ink px-5 py-3.5 text-xs uppercase tracking-widest">
            Ver como o cliente
          </a>
        </div>
        <Link to={backTo} className="inline-block mt-10 text-xs uppercase tracking-widest text-muted-foreground hover:text-ink">
          ← Voltar às propostas
        </Link>
      </div>
    );
  }

  const noBrokers = brokersQ.isSuccess && activeBrokers.length === 0;
  const lockedWithoutProfile = !!lockToUserId && brokersQ.isSuccess && !activeBrokers.some((b) => b.user_id === lockToUserId);
  const h2 = "text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-3";
  const canSave = !!brokerId && clientName.trim().length >= 2 && items.length > 0 && !lockedWithoutProfile;

  return (
    <div className={compact ? "px-4 pt-4 pb-32" : "max-w-6xl mx-auto px-6 py-14 pb-32"}>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">Propostas</p>
          <h1 className={`font-serif text-ink ${compact ? "text-2xl" : "text-4xl"}`}>{isNew ? "Nova proposta" : "Editar proposta"}</h1>
        </div>
        <Link to={backTo} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-ink">← Voltar</Link>
      </div>

      {lockedWithoutProfile && (
        <p className="mb-6 border border-amber-400/60 bg-amber-50/60 p-4 text-sm">
          Seu perfil de corretor (foto, CRECI e WhatsApp) ainda não foi cadastrado. Peça ao administrador para cadastrar em Leads → Corretores.
        </p>
      )}
      {!lockToUserId && noBrokers && (
        <p className="mb-6 border border-amber-400/60 bg-amber-50/60 p-4 text-sm">
          Cadastre primeiro o corretor com foto, CRECI e WhatsApp em{" "}
          <Link to="/admin-corretores" className="underline">Leads → Corretores</Link>.
        </p>
      )}
      {(brokersQ.error || editQ.error) && (
        <p className="mb-6 text-sm text-red-600">{((brokersQ.error || editQ.error) as Error).message}</p>
      )}

      <div className="grid gap-x-10 gap-y-8 [grid-template-areas:'cliente'_'busca'_'selecao'_'msg'] lg:grid-cols-[1fr_1.1fr] lg:[grid-template-areas:'cliente_busca'_'selecao_busca'_'msg_busca']">
        {/* 1. Corretor e cliente */}
        <section className="[grid-area:cliente] space-y-3">
          <h2 className={h2}>1. Cliente</h2>
          {lockToUserId ? (
            <p className="text-sm text-muted-foreground">Corretor: <b className="text-ink">{broker?.display_name ?? "você"}</b></p>
          ) : (
            <select value={brokerId} onChange={(e) => setBrokerId(e.target.value)} className={input}>
              <option value="">Corretor responsável…</option>
              {activeBrokers.map((b) => <option key={b.user_id} value={b.user_id}>{b.display_name}</option>)}
            </select>
          )}
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" className={input} />
          <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} inputMode="tel" placeholder="WhatsApp do cliente (opcional)" className={input} />
        </section>

        {/* 2. Busca */}
        <section className="[grid-area:busca] lg:sticky lg:top-4 lg:self-start">
          <h2 className={h2}>2. Escolher imóveis</h2>
          <div className="flex mb-3 border border-ink/15 w-full sm:w-fit">
            {([["all", "Todos"], ["sale", "Venda"], ["rent", "Aluguel"]] as const).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setPurpose(v)}
                className={`flex-1 sm:flex-none px-4 py-2.5 text-[11px] uppercase tracking-widest ${purpose === v ? "bg-ink text-canvas" : "hover:bg-ink/5"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={`${input} mb-2`}>
            {TYPE_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Código (AP07146), condomínio ou bairro" className={input} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input inputMode="numeric" value={minTxt} onChange={(e) => setMinTxt(e.target.value)} placeholder="Valor a partir de" className={input} />
            <input inputMode="numeric" value={maxTxt} onChange={(e) => setMaxTxt(e.target.value)} placeholder="Valor até" className={input} />
          </div>
          {(resultsQ.data?.length ?? 0) > 0 && (
            <div className="flex items-center justify-between mt-3 gap-2">
              <span className="text-xs text-muted-foreground">{resultsQ.data!.length >= 40 ? "40+ imóveis (refine a busca)" : `${resultsQ.data!.length} imóveis`}</span>
              <button
                type="button"
                onClick={addAll}
                disabled={items.length >= PROPOSAL_MAX_ITEMS}
                className="bg-[#F2DA00] text-[#0D0D0D] px-3 py-2 text-[11px] uppercase tracking-widest font-medium disabled:opacity-40"
              >
                Adicionar todos (até {PROPOSAL_MAX_ITEMS - items.length})
              </button>
            </div>
          )}
          <div className={`mt-3 space-y-2 overflow-y-auto ${compact ? "max-h-[55vh]" : "max-h-[70vh]"}`}>
            {resultsQ.isFetching && <p className="text-xs text-muted-foreground">Buscando…</p>}
            {resultsQ.error && <p className="text-xs text-red-600">{(resultsQ.error as Error).message}</p>}
            {(resultsQ.data ?? []).map((p) => {
              const chosen = items.some((i) => i.property.id === p.id);
              const full = items.length >= PROPOSAL_MAX_ITEMS;
              return (
                <div key={p.id} className="flex gap-3 items-center border border-ink/10 p-2 bg-white/40">
                  <Thumb p={p} />
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="font-medium text-ink line-clamp-2">{p.title}</div>
                    <div className="text-muted-foreground truncate">
                      Cód. {p.internal_code} · {priceFor(p)}
                      {facts(p) ? ` · ${facts(p)}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={chosen || full}
                    onClick={() => add(p)}
                    className="border border-ink/20 px-3 py-2 text-[11px] uppercase tracking-widest hover:bg-ink/5 disabled:opacity-40 shrink-0"
                  >
                    {chosen ? "Na lista" : "Adicionar"}
                  </button>
                </div>
              );
            })}
            {!hasFilter && <p className="text-xs text-muted-foreground">Escolha Venda ou Aluguel, o tipo, um código/condomínio ou um valor.</p>}
            {hasFilter && resultsQ.isSuccess && resultsQ.data.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhum imóvel ativo encontrado.</p>
            )}
          </div>
        </section>

        {/* 3. Seleção */}
        <section className="[grid-area:selecao]">
          <h2 className={h2}>3. Seleção ({items.length}/{PROPOSAL_MAX_ITEMS})</h2>
          {items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum imóvel escolhido ainda.</p>}
          <ol className="space-y-2">
            {items.map((it, idx) => (
              <li key={it.property.id} className="border border-ink/10 bg-white/50 p-2">
                <div className="flex gap-3 items-center">
                  <span className="text-xs text-muted-foreground w-4 text-right">{idx + 1}</span>
                  <Thumb p={it.property} />
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="font-medium text-ink truncate">{it.property.condominium_name || it.property.title}</div>
                    <div className="text-muted-foreground truncate">Cód. {it.property.internal_code} · {priceFor(it.property)}</div>
                  </div>
                  <div className="flex flex-col">
                    <button type="button" aria-label="Subir" onClick={() => move(idx, -1)} className="p-1.5 hover:bg-ink/5"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" aria-label="Descer" onClick={() => move(idx, 1)} className="p-1.5 hover:bg-ink/5"><ArrowDown className="h-4 w-4" /></button>
                  </div>
                  <button type="button" aria-label="Remover" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-1.5 text-red-600 hover:bg-red-50">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <input
                  value={it.broker_note}
                  maxLength={140}
                  onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, broker_note: e.target.value } : x)))}
                  placeholder="Nota (opcional): vista para a mata, aceita permuta…"
                  className="mt-2 w-full border border-ink/10 px-2 py-2 text-xs bg-transparent focus:outline-none focus:border-ink"
                />
              </li>
            ))}
          </ol>
        </section>

        {/* 4. Mensagem */}
        <section className="[grid-area:msg]">
          <h2 className={h2}>4. Mensagem</h2>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={600} rows={4} className={input} />
          <p className="text-[11px] text-muted-foreground mt-1">{"{cliente}"} vira o primeiro nome do cliente.</p>
        </section>
      </div>

      {/* Barra fixa de salvar */}
      <div className={`fixed inset-x-0 z-40 border-t border-ink/10 bg-canvas/95 backdrop-blur px-4 py-3 ${compact ? "bottom-16" : "bottom-0"}`}>
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.isPending || !canSave}
            className="flex-1 sm:flex-none bg-ink text-canvas px-6 py-3.5 text-xs uppercase tracking-widest font-semibold disabled:opacity-40"
          >
            {save.isPending ? "Salvando…" : isNew ? `Gerar proposta (${items.length})` : "Salvar alterações"}
          </button>
          {save.error && <p className="text-xs text-red-600">{(save.error as Error).message}</p>}
          {!save.error && !canSave && (
            <p className="hidden sm:block text-xs text-muted-foreground">Preencha o cliente e escolha ao menos um imóvel.</p>
          )}
        </div>
      </div>
    </div>
  );
}
