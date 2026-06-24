import { useNavigate } from "@tanstack/react-router";

export type FilterOptions = {
  types: string[];
  cities: string[];
  neighborhoods: string[];
  condos: string[];
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
  areaMin: number;
  sort: string;
  q: string;
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

function priceSteps(max: number, isRent: boolean): number[] {
  if (isRent) return [2000, 5000, 10000, 20000, 50000, 100000].filter((v) => v <= max * 1.5);
  return [500_000, 1_000_000, 2_000_000, 3_000_000, 5_000_000, 8_000_000, 12_000_000].filter(
    (v) => v <= max * 1.5,
  );
}

const fmtPrice = (n: number, isRent: boolean) =>
  isRent
    ? `R$ ${(n / 1000).toFixed(0)} mil`
    : n >= 1_000_000
      ? `R$ ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
      : `R$ ${(n / 1000).toFixed(0)} mil`;

const selectCls =
  "bg-white/5 text-white border border-white/15 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-brand-yellow w-full";

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

  const update = (patch: Partial<FilterState>) => {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
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
        areaMin: 0,
        sort: "recent",
        q: "",
      },
    });

  const isRent = state.purpose === "rent" || (state.purpose === "" && options.isRent);
  const steps = priceSteps(options.priceMax || 5_000_000, isRent);

  const activeChips: { label: string; clear: () => void }[] = [];
  if (state.purpose) activeChips.push({ label: state.purpose === "sale" ? "Venda" : state.purpose === "rent" ? "Locação" : "Venda/Locação", clear: () => update({ purpose: "" }) });
  if (state.type) activeChips.push({ label: TYPE_LABEL[state.type] ?? cap(state.type), clear: () => update({ type: "" }) });
  if (state.city) activeChips.push({ label: state.city, clear: () => update({ city: "" }) });
  if (state.neighborhood) activeChips.push({ label: state.neighborhood, clear: () => update({ neighborhood: "" }) });
  if (state.condo) activeChips.push({ label: state.condo, clear: () => update({ condo: "" }) });
  if (state.bedrooms) activeChips.push({ label: `${state.bedrooms}+ dorm.`, clear: () => update({ bedrooms: 0 }) });
  if (state.parking) activeChips.push({ label: `${state.parking}+ vagas`, clear: () => update({ parking: 0 }) });
  if (state.priceMin) activeChips.push({ label: `≥ ${fmtPrice(state.priceMin, isRent)}`, clear: () => update({ priceMin: 0 }) });
  if (state.priceMax) activeChips.push({ label: `≤ ${fmtPrice(state.priceMax, isRent)}`, clear: () => update({ priceMax: 0 }) });
  if (state.areaMin) activeChips.push({ label: `≥ ${state.areaMin} m²`, clear: () => update({ areaMin: 0 }) });
  if (state.q) activeChips.push({ label: `"${state.q}"`, clear: () => update({ q: "" }) });

  return (
    <section className="bg-brand-dark text-white">
      <div className="max-w-7xl mx-auto px-6 py-6 md:py-8 space-y-3">
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
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select className={selectCls} value={state.neighborhood} onChange={(e) => update({ neighborhood: e.target.value })} aria-label="Bairro">
            <option value="">Bairro — todos</option>
            {options.neighborhoods.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={clear}
            className="bg-brand-yellow text-brand-dark font-bold uppercase tracking-widest text-xs py-2 px-4 rounded-sm hover:brightness-95"
          >
            Limpar filtros
          </button>
        </div>

        {/* Linha 2 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
          <select className={selectCls} value={state.priceMin} onChange={(e) => update({ priceMin: Number(e.target.value) })} aria-label="Valor mínimo">
            <option value="0">Valor de</option>
            {steps.map((v) => (
              <option key={v} value={v}>{fmtPrice(v, isRent)}</option>
            ))}
          </select>
          <select className={selectCls} value={state.priceMax} onChange={(e) => update({ priceMax: Number(e.target.value) })} aria-label="Valor máximo">
            <option value="0">Valor até</option>
            {steps.map((v) => (
              <option key={v} value={v}>{fmtPrice(v, isRent)}</option>
            ))}
          </select>
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
            <option value="recent">Mais recentes</option>
            <option value="price_asc">Menor preço</option>
            <option value="price_desc">Maior preço</option>
            <option value="area_desc">Maior área</option>
          </select>
        </div>

        {/* Linha 3 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3">
          <select className={`${selectCls} md:col-span-2`} value={state.condo} onChange={(e) => update({ condo: e.target.value })} aria-label="Condomínio">
            <option value="">Condomínio — todos</option>
            {options.condos.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
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
            value={state.q}
            onChange={(e) => update({ q: e.target.value })}
            aria-label="Buscar"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
          <span className="text-white/70">
            {filteredCount} de {totalCount} {totalCount === 1 ? "imóvel" : "imóveis"}
          </span>
          {activeChips.length > 0 && (
            <>
              <span className="text-white/30">·</span>
              {activeChips.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={c.clear}
                  className="inline-flex items-center gap-1 bg-white/10 hover:bg-brand-yellow hover:text-brand-dark text-white px-2 py-1 rounded-sm"
                >
                  {c.label} <span aria-hidden>✕</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
