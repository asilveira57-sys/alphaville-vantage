import { Fragment, useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { findPropertyByCode, MORE_FILTER_MIN, type CondoFacet, type MoreFacets } from "@/lib/property-search.functions";
import { CATEGORY_LABEL, FURNISHING_LABEL, FEATURE_GROUP_LABEL, type FeatureGroup } from "@/lib/property-features";
import { listParam, moreFiltersCount } from "@/lib/property-query";
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
  moreFacets?: MoreFacets;
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
  suites?: number;
  estilo?: string;
  mobilia?: string;
  carac?: string;
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
  onApplyMany,
  filteredCount,
}: {
  options: CondoFacet[];
  selected: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
  onApplyMany: (slugs: string[]) => void;
  filteredCount: number;
}) {
  const isMobile = useIsMobile();
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
      {open && isMobile && (
        <CondoSheetMobile
          options={options}
          selected={selected}
          filteredCount={filteredCount}
          onClose={() => setOpen(false)}
          onApply={(slugs) => {
            setOpen(false);
            onApplyMany(slugs);
          }}
        />
      )}
      {open && !isMobile && (
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

// Celular: tela cheia em portal no body. A seleção fica em rascunho e só vale
// ao tocar em "Ver N imóveis"; o ✕ descarta. Sem foco automático na busca.
const letterOf = (name: string) => {
  const c = normTxt(name.trim()).charAt(0).toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
};

function CondoSheetMobile({
  options,
  selected,
  filteredCount,
  onClose,
  onApply,
}: {
  options: CondoFacet[];
  selected: string[];
  filteredCount: number;
  onClose: () => void;
  onApply: (slugs: string[]) => void;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  const [term, setTerm] = useState("");
  const [vh, setVh] = useState<number | null>(null);

  // trava a rolagem da página por trás (inclusive no iOS)
  useEffect(() => {
    const y = window.scrollY;
    const b = document.body.style;
    const prev = { position: b.position, top: b.top, left: b.left, right: b.right, width: b.width, overflow: b.overflow };
    b.position = "fixed";
    b.top = `-${y}px`;
    b.left = "0";
    b.right = "0";
    b.width = "100%";
    b.overflow = "hidden";
    return () => {
      Object.assign(b, prev);
      window.scrollTo(0, y);
    };
  }, []);

  // com o teclado aberto, a tela encolhe até a área visível para o rodapé não sumir
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setVh(vv.height < window.innerHeight - 80 ? vv.height : null);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, []);

  const bySlug = useMemo(() => new Map(options.map((o) => [o.slug, o])), [options]);
  const sorted = useMemo(() => [...options].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [options]);
  const top = useMemo(() => [...options].sort((a, b) => b.n - a.n).slice(0, 8), [options]);
  const t = normTxt(term.trim());
  const found = t ? sorted.filter((o) => normTxt(o.name).includes(t)) : sorted;

  const toggle = (slug: string) => setDraft((d) => (d.includes(slug) ? d.filter((x) => x !== slug) : [...d, slug]));
  const count = draft.length ? draft.reduce((sum, s) => sum + (bySlug.get(s)?.n ?? 0), 0) : selected.length ? null : filteredCount;
  const cta = count == null ? "Ver todos os imóveis" : `Ver ${count.toLocaleString("pt-BR")} ${count === 1 ? "imóvel" : "imóveis"}`;

  const row = (o: CondoFacet, key: string) => {
    const on = draft.includes(o.slug);
    return (
      <li key={key}>
        <label className="flex items-center gap-3 min-h-[48px] px-4 text-[15px] text-white active:bg-white/10 cursor-pointer">
          <input type="checkbox" checked={on} onChange={() => toggle(o.slug)} className="accent-brand-yellow w-5 h-5 shrink-0" />
          <span className={`flex-1 ${on ? "font-semibold" : ""}`}>{o.name}</span>
          <span className="text-white/50 text-xs tabular-nums">{o.n}</span>
        </label>
      </li>
    );
  };

  let lastLetter = "";
  const body = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filtrar por condomínio"
      className="fixed inset-x-0 top-0 z-[100] bg-brand-dark text-white flex flex-col"
      style={{ height: vh ? `${vh}px` : "100dvh" }}
    >
      <div className="shrink-0 border-b border-white/10 px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Condomínios</h2>
          <button type="button" onClick={onClose} aria-label="Fechar sem aplicar" className="w-11 h-11 -mr-2 grid place-items-center text-xl text-white/80">
            ✕
          </button>
        </div>
        <input
          type="search"
          enterKeyHint="search"
          className={`${selectCls} text-base py-3`}
          placeholder="Buscar condomínio…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          aria-label="Buscar condomínio"
        />
        {draft.length > 0 && (
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" aria-label="Selecionados">
            {draft.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                className="shrink-0 inline-flex items-center gap-1.5 bg-brand-yellow text-brand-dark text-sm font-semibold px-3 py-1.5 rounded-full"
              >
                {bySlug.get(s)?.name ?? s} <span aria-hidden>✕</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {!t && (
          <>
            <p className="px-4 pt-4 pb-1 text-[11px] font-bold uppercase tracking-widest text-brand-yellow">Mais procurados</p>
            <ul>
              {top.map((o) => row(o, `top-${o.id}`))}
            </ul>
            <p className="px-4 pt-5 pb-1 text-[11px] font-bold uppercase tracking-widest text-white/50">Todos de A a Z</p>
          </>
        )}
        <ul>
          {found.map((o) => {
            const L = letterOf(o.name);
            const sep = !t && L !== lastLetter;
            lastLetter = L;
            return (
              <Fragment key={o.id}>
                {sep && (
                  <li aria-hidden className="sticky top-0 z-10 bg-brand-dark/95 px-4 py-1 text-xs font-bold text-white/60 border-b border-white/10">{L}</li>
                )}
                {row(o, o.id)}
              </Fragment>
            );
          })}
          {found.length === 0 && <li className="px-4 py-6 text-sm text-white/60">Nenhum condomínio encontrado.</li>}
        </ul>
      </div>

      <div
        className="shrink-0 border-t border-white/10 px-4 pt-3 flex gap-2 bg-brand-dark"
        style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => setDraft([])}
          disabled={draft.length === 0}
          className="px-4 min-h-[48px] text-xs font-bold uppercase tracking-widest text-white/80 border border-white/15 rounded-sm disabled:opacity-40"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={() => onApply(draft)}
          className="flex-1 min-h-[48px] bg-brand-yellow text-brand-dark font-bold uppercase tracking-widest text-xs rounded-sm"
        >
          {cta}
        </button>
      </div>
    </div>
  );
  return createPortal(body, document.body);
}

// "Mais filtros": suítes, estilo, mobília e características. Painel no desktop,
// tela cheia no celular. Cada clique já filtra; contagens respeitam os outros filtros.
function MoreFiltersPanel({
  facets,
  state,
  onChange,
  onClear,
}: {
  facets?: MoreFacets;
  state: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const n = moreFiltersCount(state);
  const estilo = listParam(state.estilo);
  const mobilia = listParam(state.mobilia);
  const carac = listParam(state.carac);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(",");
  const cats = Object.entries(facets?.categories ?? {})
    .filter(([k, c]) => c >= MORE_FILTER_MIN || estilo.includes(k))
    .sort((a, b) => b[1] - a[1]);
  const furn = (["mobiliado", "semi-mobiliado"] as const)
    .map((k) => [k, facets?.furnishing?.[k] ?? 0] as const)
    .filter(([k, c]) => c >= MORE_FILTER_MIN || mobilia.includes(k));
  const groups = (["lazer", "imovel", "estado"] as FeatureGroup[])
    .map((g) => ({ g, items: (facets?.features ?? []).filter((f) => f.group === g) }))
    .filter((x) => x.items.length);
  const pill = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-sm border transition-colors ${
      active ? "bg-brand-yellow text-brand-dark border-brand-yellow font-semibold" : "border-white/15 text-white hover:border-white/40"
    }`;
  const count = (c: number) => <span className={"text-xs opacity-60"}>({c})</span>;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${selectCls} text-left flex items-center justify-between gap-2 ${n ? "border-brand-yellow text-brand-yellow" : ""}`}
      >
        <span className="truncate">Mais filtros{n ? ` (${n})` : ""}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 md:bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-label="Mais filtros"
            className="fixed inset-0 z-50 bg-brand-dark flex flex-col md:inset-auto md:right-6 md:top-24 md:w-[720px] md:max-h-[80vh] md:border md:border-white/15 md:rounded-sm md:shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <p className="font-bold uppercase tracking-widest text-xs">Mais filtros</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="px-2 py-1 text-white/70 hover:text-white">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-6">
              <fieldset>
                <legend className="text-[11px] uppercase tracking-widest text-white/60 mb-2">Suítes</legend>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((k) => {
                    const c = facets?.suites?.[String(k)] ?? 0;
                    const active = state.suites === k;
                    if (c < MORE_FILTER_MIN && !active) return null;
                    return (
                      <button key={k} type="button" aria-pressed={active} className={pill(active)} onClick={() => onChange({ suites: active ? 0 : k })}>
                        {k}+ {count(c)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              {cats.length > 0 && (
                <fieldset>
                  <legend className="text-[11px] uppercase tracking-widest text-white/60 mb-2">Estilo</legend>
                  <div className="flex flex-wrap gap-2">
                    {cats.map(([k, c]) => (
                      <button key={k} type="button" aria-pressed={estilo.includes(k)} className={pill(estilo.includes(k))} onClick={() => onChange({ estilo: toggle(estilo, k) })}>
                        {CATEGORY_LABEL[k] ?? cap(k)} {count(c)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {furn.length > 0 && (
                <fieldset>
                  <legend className="text-[11px] uppercase tracking-widest text-white/60 mb-2">Mobília</legend>
                  <div className="flex flex-wrap gap-2">
                    {furn.map(([k, c]) => (
                      <button key={k} type="button" aria-pressed={mobilia.includes(k)} className={pill(mobilia.includes(k))} onClick={() => onChange({ mobilia: toggle(mobilia, k) })}>
                        {FURNISHING_LABEL[k]} {count(c)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              {groups.map(({ g, items }) => (
                <fieldset key={g}>
                  <legend className="text-[11px] uppercase tracking-widest text-white/60 mb-2">{FEATURE_GROUP_LABEL[g]}</legend>
                  <div className="flex flex-wrap gap-2">
                    {items.map((f) => (
                      <button key={f.slug} type="button" aria-pressed={carac.includes(f.slug)} className={pill(carac.includes(f.slug))} onClick={() => onChange({ carac: toggle(carac, f.slug) })}>
                        {f.label} {count(f.n)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
              {!cats.length && !furn.length && !groups.length && (
                <p className="text-sm text-white/60">Características, estilo e mobília aparecem aqui conforme os imóveis são atualizados.</p>
              )}
            </div>
            <div className="p-3 border-t border-white/10 flex gap-2">
              {n > 0 && (
                <button type="button" onClick={onClear} className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-white/70 border border-white/15 rounded-sm">
                  Limpar
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} className="flex-1 bg-brand-yellow text-brand-dark font-bold uppercase tracking-widest text-xs py-3 rounded-sm">
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
        suites: 0,
        estilo: "",
        mobilia: "",
        carac: "",
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
  if (state.suites) activeChips.push({ label: `${state.suites}+ suítes`, clear: () => update({ suites: 0 }) });
  const estiloSel = listParam(state.estilo);
  for (const k of estiloSel) activeChips.push({ label: CATEGORY_LABEL[k] ?? cap(k), clear: () => update({ estilo: estiloSel.filter((x) => x !== k).join(",") }) });
  const mobSel = listParam(state.mobilia);
  for (const k of mobSel) activeChips.push({ label: FURNISHING_LABEL[k] ?? cap(k), clear: () => update({ mobilia: mobSel.filter((x) => x !== k).join(",") }) });
  const caracSel = listParam(state.carac);
  for (const k of caracSel) {
    const label = options.moreFacets?.features.find((f) => f.slug === k)?.label ?? cap(k.replace(/-/g, " "));
    activeChips.push({ label, clear: () => update({ carac: caracSel.filter((x) => x !== k).join(",") }) });
  }
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
            onApplyMany={(slugs) => update({ condo: slugs.join(",") })}
            filteredCount={filteredCount}
          />
          <select className={selectCls} value={state.areaMin} onChange={(e) => update({ areaMin: Number(e.target.value) })} aria-label="Área mínima">
            <option value="0">Área mínima</option>
            {[40, 60, 80, 100, 150, 200, 300, 500].map((a) => (
              <option key={a} value={a}>{a} m²+</option>
            ))}
          </select>
          <MoreFiltersPanel
            facets={options.moreFacets}
            state={state}
            onChange={update}
            onClear={() => update({ suites: 0, estilo: "", mobilia: "", carac: "" })}
          />
          <input
            className={selectCls}
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
