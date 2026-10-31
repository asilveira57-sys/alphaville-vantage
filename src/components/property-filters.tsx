import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { findPropertyByCode, type CondoFacet } from "@/lib/property-search.functions";
import { appliedQuery, maskBrlInput, parseBrlInput, SEARCH_DELAY_MS } from "@/lib/property-listing";
import { Button } from "@/components/ui/button";

export type FilterOptions = {
  types: string[];
  cities: string[];
  neighborhoods: string[];
  cityCounts?: Record<string, number>;
  condoCounts?: Record<string, number>;
  neighborhoodCounts?: Record<string, number>;
  condos: string[];
  condoOptions?: CondoFacet[];
  priceMax: number;
  isRent: boolean;
};

export type FilterState = {
  purpose: string;
  type: string;
  city: string;
  neighborhood: string;
  condo: string;
  bedrooms: number;
  parking: number;
  priceMin: number;
  priceMax: number;
  min?: number;
  max?: number;
  areaMin: number;
  sort: string;
  q: string;
  page: number;
};

const TYPE_LABEL: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  terreno: "Terreno",
  sala: "Sala comercial",
  loja: "Loja",
  galpão: "Galpão",
  prédio: "Prédio",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const brlShort = (n: number) => `R$ ${n.toLocaleString("pt-BR")}`;

const selectCls =
  "bg-white/5 text-white border border-white/15 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-brand-yellow w-full [&>option]:bg-white [&>option]:text-ink";

const normTxt = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Campo digitável de valor em reais: aplica ao sair do campo ou com Enter.
function PriceInput({
  value,
  placeholder,
  ariaLabel,
  onApply,
}: {
  value: number;
  placeholder: string;
  ariaLabel: string;
  onApply: (v: number) => void;
}) {
  const [text, setText] = useState(value ? maskBrlInput(String(value)) : "");
  const lastApplied = useRef(value);
  useEffect(() => {
    if (value !== lastApplied.current) {
      setText(value ? maskBrlInput(String(value)) : "");
      lastApplied.current = value;
    }
  }, [value]);
  const commit = () => {
    const v = parseBrlInput(text);
    setText(v ? maskBrlInput(String(v)) : "");
    if (v !== lastApplied.current) {
      lastApplied.current = v;
      onApply(v);
    }
  };
  return (
    <input
      className={selectCls}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={text}
      onChange={(e) => setText(maskBrlInput(e.target.value))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

// Condomínio com seleção múltipla: dropdown com busca e checkbox no desktop;
// tela cheia com botão "Aplicar" no celular. Match exato por condominium_id.
function CondoMultiSelect({
  options,
  selected,
  onToggle,
  onClear,
}: {
  options: CondoFacet[];
  selected: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const toggle = onToggle;
  const list = term ? options.filter((o) => normTxt(o.name).includes(normTxt(term.trim()))) : options;
  const label =
    selected.length === 0
      ? "Condomínio — todos"
      : selected.length === 1
        ? (options.find((o) => o.slug === selected[0])?.name ?? selected[0])
        : `${selected.length} condomínios`;
  return (
    <div className="relative md:col-span-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${selectCls} text-left flex items-center justify-between gap-2`}
      >
        <span className="truncate">{label}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-label="Filtrar por condomínio"
            className="fixed inset-0 z-50 bg-brand-dark flex flex-col md:absolute md:inset-auto md:top-full md:left-0 md:mt-1 md:z-50 md:border md:border-white/15 md:rounded-sm md:shadow-xl md:max-h-96 md:min-w-72"
          >
            <div className="flex items-center gap-2 p-3 border-b border-white/10">
              <input
                autoFocus
                className={selectCls}
                placeholder="Buscar condomínio…"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                aria-label="Buscar condomínio"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="hidden md:inline-flex px-2 py-2 text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>
            <ul className="overflow-y-auto flex-1 p-2 space-y-0.5">
              {list.map((o) => (
                <li key={o.id}>
                  <label className="flex items-center gap-2 px-2 py-2 text-sm text-white hover:bg-white/5 rounded-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(o.slug)}
                      onChange={() => toggle(o.slug)}
                      className="accent-brand-yellow w-4 h-4"
                    />
                    <span className="flex-1">{o.name}</span>
                    <span className="text-white/50 text-xs">({o.n})</span>
                  </label>
                </li>
              ))}
              {list.length === 0 && (
                <li className="px-2 py-3 text-sm text-white/60">Nenhum condomínio encontrado.</li>
              )}
            </ul>
            <div className="md:hidden p-3 border-t border-white/10 flex gap-2">
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-white/70 border border-white/15 rounded-sm"
                >
                  Limpar
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 bg-brand-yellow text-brand-dark font-bold uppercase tracking-widest text-xs py-3 rounded-sm"
              >
                Aplicar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function PropertyFilters({
  options,
  state,
  filteredCount,
  totalCount,
}: {
  options: FilterOptions;
  state: FilterState;
  filteredCount: number;
  totalCount: number;
}) {
  const navigate = useNavigate({ from: "/imoveis" });
  const findCode = useServerFn(findPropertyByCode);
  const [query, setQuery] = useState(state.q);
  const queryRef = useRef(query);
  queryRef.current = query;
  const lastApplied = useRef(state.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { if (state.q !== lastApplied.current) setQuery(state.q); lastApplied.current = state.q; }, [state.q]);
  const apply = async (text: string) => {
    const q = appliedQuery(text);
    if (q === lastApplied.current) return;
    const slug = q ? await findCode({ data: { code: q } }) : null;
    if (text !== queryRef.current) return;
    lastApplied.current = q;
    if (slug) { navigate({ to: "/imoveis/$slug", params: { slug }, replace: true, resetScroll: false }); return; }
    navigate({ search: (prev) => ({ ...prev, q, page: 1 }), replace: true, resetScroll: false });
  };
  useEffect(() => {
    timer.current = setTimeout(() => { void apply(query); }, SEARCH_DELAY_MS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  const update = (patch: Partial<FilterState>) => {
    navigate({ search: (prev: FilterState) => ({ ...prev, ...patch, page: 1 }), resetScroll: false });
  };

  // Marca/desmarca condomínio lendo a URL no momento do clique — cliques
  // rápidos em sequência não se sobrescrevem.
  const toggleCondo = (slug: string) => {
    navigate({
      search: (prev: FilterState) => {
        const cur = prev.condo ? prev.condo.split(",").map((t) => t.trim()).filter(Boolean) : [];
        const next = cur.includes(slug) ? cur.filter((x) => x !== slug) : [...cur, slug];
        return { ...prev, condo: next.join(","), page: 1 };
      },
      resetScroll: false,
    });
  };

  const clear = () =>
    navigate({
      search: {
        purpose: "",
        type: "",
        city: "",
        neighborhood: "",
        condo: "",
        bedrooms: 0,
        parking: 0,
        priceMin: 0,
        priceMax: 0,
        min: 0,
        max: 0,
        areaMin: 0,
        sort: "price_asc",
        q: "",
        page: 1,
      },
    });

  const [showFilters, setShowFilters] = useState(false);
  const isRent = state.purpose === "rent" || (state.purpose === "" && options.isRent);
  const condoTokens = state.condo ? state.condo.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const condoName = (t: string) =>
    options.condoOptions?.find((o) => o.slug === t || o.name === t)?.name ?? t;

  const activeChips: { label: string; clear: () => void }[] = [];
  if (state.purpose) activeChips.push({ label: state.purpose === "sale" ? "Venda" : state.purpose === "rent" ? "Locação" : "Venda/Locação", clear: () => update({ purpose: "" }) });
  if (state.type) activeChips.push({ label: TYPE_LABEL[state.type] ?? cap(state.type), clear: () => update({ type: "" }) });
  if (state.city) activeChips.push({ label: state.city, clear: () => update({ city: "" }) });
  if (state.neighborhood) activeChips.push({ label: state.neighborhood, clear: () => update({ neighborhood: "" }) });
  for (const t of condoTokens) {
    activeChips.push({ label: condoName(t), clear: () => update({ condo: condoTokens.filter((x) => x !== t).join(",") }) });
  }
  if (state.bedrooms) activeChips.push({ label: `${state.bedrooms}+ dorm.`, clear: () => update({ bedrooms: 0 }) });
  if (state.parking) activeChips.push({ label: `${state.parking}+ vagas`, clear: () => update({ parking: 0 }) });
  if (state.priceMin) activeChips.push({ label: `≥ ${brlShort(state.priceMin)}${isRent ? "/mês" : ""}`, clear: () => update({ priceMin: 0, min: 0 }) });
  if (state.priceMax) activeChips.push({ label: `≤ ${brlShort(state.priceMax)}${isRent ? "/mês" : ""}`, clear: () => update({ priceMax: 0, max: 0 }) });
  if (state.areaMin) activeChips.push({ label: `≥ ${state.areaMin} m²`, clear: () => update({ areaMin: 0 }) });
  if (state.q) activeChips.push({ label: `"${state.q}"`, clear: () => update({ q: "" }) });

  return (
    <section className="bg-brand-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-8 space-y-3">
        {/* Abre/fecha os filtros no celular */}
        <Button variant="ghost"
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="md:hidden w-full flex items-center justify-between gap-3 bg-brand-yellow text-brand-dark font-bold uppercase tracking-widest text-[11px] py-3 px-4 rounded-sm"
        >
          <span>
            {showFilters ? "Fechar filtros" : "Filtrar imóveis"}
            {activeChips.length > 0 ? ` · ${activeChips.length}` : ""}
          </span>
          <span aria-hidden>{showFilters ? "▲" : "▼"}</span>
        </Button>

        <div className={`${showFilters ? "block" : "hidden"} md:block space-y-3`}>
        {/* Linha 1 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
          <select className={selectCls} value={state.purpose} onChange={(e) => update({ purpose: e.target.value })} aria-label="Finalidade">
            <option value="">Finalidade — todas</option>
            <option value="sale">Venda</option>
            <option value="rent">Locação</option>
            <option value="both">Venda e locação</option>
          </select>
          <select className={selectCls} value={state.type} onChange={(e) => update({ type: e.target.value })} aria-label="Tipo">
            <option value="">Tipo — todos</option>
            {options.types.map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t] ?? cap(t)}</option>
            ))}
          </select>
          <select className={selectCls} value={state.city} onChange={(e) => update({ city: e.target.value })} aria-label="Cidade">
            <option value="">Cidade — todas</option>
            {options.cities.map((c) => (
              <option key={c} value={c}>{options.cityCounts?.[c] != null ? `${c} (${options.cityCounts[c]})` : c}</option>
            ))}
          </select>
          <select className={selectCls} value={state.neighborhood} onChange={(e) => update({ neighborhood: e.target.value })} aria-label="Bairro">
            <option value="">Bairro — todos</option>
            {options.neighborhoods.map((b) => (
              <option key={b} value={b}>{options.neighborhoodCounts?.[b] != null ? `${b} (${options.neighborhoodCounts[b]})` : b}</option>
            ))}
          </select>
          <Button variant="ghost"
            type="button"
            onClick={clear}
            className="bg-brand-yellow text-brand-dark font-bold uppercase tracking-widest text-xs py-2 px-4 rounded-sm hover:brightness-95"
          >
            Limpar filtros
          </Button>
        </div>

        {/* Linha 2 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
          <PriceInput
            value={state.priceMin}
            placeholder="Valor de"
            ariaLabel="Valor mínimo"
            onApply={(v) => update({ min: v, priceMin: 0 })}
          />
          <PriceInput
            value={state.priceMax}
            placeholder="Valor até"
            ariaLabel="Valor máximo"
            onApply={(v) => update({ max: v, priceMax: 0 })}
          />
          <select className={selectCls} value={state.bedrooms} onChange={(e) => update({ bedrooms: Number(e.target.value) })} aria-label="Dormitórios">
            <option value="0">Dormitórios</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}+ dorm.</option>
            ))}
          </select>
          <select className={selectCls} value={state.parking} onChange={(e) => update({ parking: Number(e.target.value) })} aria-label="Vagas">
            <option value="0">Vagas</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}+ vagas</option>
            ))}
          </select>
          <select className={selectCls} value={state.sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Ordenar">
            <option value="price_asc">Menor preço</option>
            <option value="recent">Mais recentes</option>
            <option value="price_desc">Maior preço</option>
            <option value="area_desc">Maior área</option>
          </select>
        </div>

        {/* Linha 3 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3">
          <CondoMultiSelect
            options={options.condoOptions ?? []}
            selected={condoTokens
              .map((t) => options.condoOptions?.find((o) => o.slug === t || o.name === t)?.slug ?? t)
              .filter((t) => options.condoOptions?.some((o) => o.slug === t) ?? false)}
            onToggle={toggleCondo}
            onClear={() => update({ condo: "" })}
          />
          <select className={selectCls} value={state.areaMin} onChange={(e) => update({ areaMin: Number(e.target.value) })} aria-label="Área mínima">
            <option value="0">Área mínima</option>
            {[40, 60, 80, 100, 150, 200, 300, 500].map((a) => (
              <option key={a} value={a}>{a} m²+</option>
            ))}
          </select>
          <input
            className={`${selectCls} md:col-span-2`}
            type="search"
            placeholder="Buscar por título, condomínio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (timer.current) clearTimeout(timer.current); void apply(query); } }}
            aria-label="Buscar"
          />
        </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
          <span className="text-white/70">
            {filteredCount} de {totalCount} {totalCount === 1 ? "imóvel" : "imóveis"}
          </span>
          {activeChips.length > 0 && (
            <>
              <span className="text-white/30">·</span>
              {activeChips.map((c, i) => (
                <Button variant="ghost"
                  key={i}
                  type="button"
                  onClick={c.clear}
                  className="inline-flex items-center gap-1 bg-white/10 hover:bg-brand-yellow hover:text-brand-dark text-white px-2 py-1 rounded-sm"
                >
                  {c.label} <span aria-hidden>✕</span>
                </Button>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
