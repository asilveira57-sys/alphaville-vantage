import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Building2, ChevronRight, Home, LandPlot, MapPin, Search, Store } from "lucide-react";
import { searchProperties, getCondoFacets } from "@/lib/property-search.functions";
import { IMOVEIS_DEFAULTS, type ImoveisSearch } from "@/lib/property-query";
import {
  BEDROOM_CHOICES, COMMERCIAL_CHOICES, PRICE_CHOICES, REGION_CHOICES, TYPE_CHOICES,
  emptyAppSearch, hasBedrooms, toImoveisSearch, trackApp, type AppPurpose, type AppSearch,
} from "@/lib/app-cliente";

// Busca guiada do app: uma pergunta por tela; o botão do rodapé leva aos
// resultados em /imoveis a qualquer momento, com os filtros já respondidos.
export const Route = createFileRoute("/app/buscar")({
  validateSearch: zodValidator(z.object({ f: fallback(z.enum(["sale", "rent"]), "sale").default("sale") })),
  head: () => ({ meta: [{ title: "Buscar imóveis · S.A Imóveis" }, { name: "robots", content: "noindex,follow" }] }),
  component: AppBuscar,
});

type Step = "tipo" | "comercial" | "onde" | "valor" | "quartos";

const ICON: Record<string, ReactNode> = {
  casa: <Home className="h-6 w-6" />,
  apartamento: <Building2 className="h-6 w-6" />,
  terreno: <LandPlot className="h-6 w-6" />,
  comercial: <Store className="h-6 w-6" />,
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

function useCount(s: AppSearch | null) {
  const fn = useServerFn(searchProperties);
  return useQuery({
    queryKey: ["appCount", s && toImoveisSearch(s)],
    enabled: !!s,
    staleTime: 5 * 60_000,
    queryFn: async () => (await fn({ data: { ...IMOVEIS_DEFAULTS, ...(toImoveisSearch(s!) as Partial<ImoveisSearch>), limit: 1 } })).total,
  });
}

function useCounts(list: AppSearch[]) {
  const fn = useServerFn(searchProperties);
  return useQueries({
    queries: list.map((s) => ({
      queryKey: ["appCount", toImoveisSearch(s)],
      staleTime: 5 * 60_000,
      queryFn: async () => (await fn({ data: { ...IMOVEIS_DEFAULTS, ...(toImoveisSearch(s) as Partial<ImoveisSearch>), limit: 1 } })).total,
    })),
  }).map((q) => q.data);
}

function AppBuscar() {
  const { f } = Route.useSearch();
  const purpose = f as AppPurpose;
  const navigate = useNavigate();
  const [s, setS] = useState<AppSearch>(() => emptyAppSearch(purpose));
  const [history, setHistory] = useState<Step[]>(["tipo"]);
  const step = history[history.length - 1];
  const total = useCount(s);

  const steps: Step[] = ["tipo", ...(s.type && COMMERCIAL_CHOICES.some((c) => c.type === s.type) ? (["comercial"] as Step[]) : []), "onde", "valor", ...(hasBedrooms(s.type) || step === "tipo" ? (["quartos"] as Step[]) : [])];
  const pos = Math.max(0, steps.indexOf(step)) + 1;

  const results = (final: AppSearch = s) => {
    trackApp("app_busca_resultados", { finalidade: purpose, tipo: final.type, passo: step });
    void navigate({ to: "/imoveis", search: toImoveisSearch(final) as never });
  };
  const go = (next: Step | "fim", patch: Partial<AppSearch>) => {
    const ns = { ...s, ...patch };
    setS(ns);
    if (next === "fim") results(ns);
    else setHistory((h) => [...h, next]);
  };
  const back = () => {
    if (history.length <= 1) return void navigate({ to: "/app" });
    setHistory((h) => h.slice(0, -1));
  };
  const afterValor = (type: string): Step | "fim" => (hasBedrooms(type) ? "quartos" : "fim");

  return (
    <div className="h-[100dvh] bg-[#0D0D0D] text-white flex flex-col pt-[max(12px,env(safe-area-inset-top))]">
      <div className="px-4 flex items-center justify-between text-sm text-white/60">
        <button type="button" onClick={back} className="flex items-center gap-1.5 py-2 -ml-1 pr-3" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" /> {purpose === "sale" ? "Comprar" : "Alugar"}
        </button>
        <span>{pos} de {steps.length}</span>
      </div>
      <div className="mx-4 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#F2DA00] transition-all" style={{ width: `${(pos / steps.length) * 100}%` }} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4">
        {step === "tipo" && <StepTipo purpose={purpose} onPick={(type) => go(type === "comercial" ? "comercial" : "onde", { type: type === "comercial" ? "" : type })} />}
        {step === "comercial" && <StepComercial purpose={purpose} onPick={(type) => go("onde", { type })} />}
        {step === "onde" && <StepOnde s={s} onPick={(patch) => go("valor", patch)} />}
        {step === "valor" && (
          <Question title="Até quanto?">
            {PRICE_CHOICES[purpose].map((p) => (
              <Option key={p.label} onClick={() => go(afterValor(s.type), { min: p.min, max: p.max })}>{p.label}</Option>
            ))}
            <Option muted onClick={() => go(afterValor(s.type), { min: 0, max: 0 })}>Qualquer valor</Option>
          </Question>
        )}
        {step === "quartos" && (
          <Question title="Quantos dormitórios, no mínimo?">
            {BEDROOM_CHOICES.map((n) => (
              <Option key={n} onClick={() => go("fim", { bedrooms: n })}>{n === 4 ? "4 ou mais" : `${n}+`}</Option>
            ))}
            <Option muted onClick={() => go("fim", { bedrooms: 0 })}>Tanto faz</Option>
          </Question>
        )}
      </div>

      <div className="px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] border-t border-white/10 bg-[#0D0D0D]">
        <button
          type="button"
          onClick={() => results()}
          className="w-full h-14 rounded-xl bg-[#F2DA00] text-[#1A1A00] text-lg font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <Search className="h-5 w-5" />
          {total.data === undefined ? "Ver imóveis" : total.data === 0 ? "Nenhum imóvel — ajuste a busca" : `Ver ${fmt(total.data)} ${total.data === 1 ? "imóvel" : "imóveis"}`}
        </button>
      </div>
    </div>
  );
}

function Question({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h1 className="text-2xl font-medium mb-2">{title}</h1>
      {children}
    </div>
  );
}

function Option({ children, onClick, count, icon, muted }: { children: ReactNode; onClick: () => void; count?: number; icon?: ReactNode; muted?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full min-h-16 rounded-xl px-5 flex items-center gap-4 text-left text-lg active:scale-[0.98] transition-transform ${muted ? "border border-white/15 text-white/70" : "bg-[#1F1F1D] text-[#F2DA00]"}`}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {count !== undefined && <span className="text-sm text-white/50">{fmt(count)}</span>}
      <ChevronRight className="h-5 w-5 text-white/30" />
    </button>
  );
}

function StepTipo({ purpose, onPick }: { purpose: AppPurpose; onPick: (type: string) => void }) {
  const base = TYPE_CHOICES[purpose];
  const simple = base.filter((c) => c.type !== "comercial");
  const counts = useCounts([
    ...simple.map((c) => ({ ...emptyAppSearch(purpose), type: c.type })),
    ...COMMERCIAL_CHOICES.map((c) => ({ ...emptyAppSearch(purpose), type: c.type })),
  ]);
  const comm = counts.slice(simple.length);
  const commTotal = comm.every((n) => n !== undefined) ? comm.reduce<number>((a, n) => a + (n ?? 0), 0) : undefined;
  return (
    <Question title="O que você procura?">
      {base.map((c) => (
        <Option key={c.type} icon={ICON[c.type]} count={c.type === "comercial" ? commTotal : counts[simple.indexOf(c)]} onClick={() => onPick(c.type)}>
          {c.label}
        </Option>
      ))}
      <Option muted onClick={() => onPick("")}>Qualquer tipo</Option>
    </Question>
  );
}

function StepComercial({ purpose, onPick }: { purpose: AppPurpose; onPick: (type: string) => void }) {
  const counts = useCounts(COMMERCIAL_CHOICES.map((c) => ({ ...emptyAppSearch(purpose), type: c.type })));
  return (
    <Question title="Que tipo de imóvel comercial?">
      {COMMERCIAL_CHOICES.map((c, i) => (counts[i] === 0 ? null : (
        <Option key={c.type} count={counts[i]} onClick={() => onPick(c.type)}>{c.label}</Option>
      )))}
    </Question>
  );
}

function StepOnde({ s, onPick }: { s: AppSearch; onPick: (patch: Partial<AppSearch>) => void }) {
  const [q, setQ] = useState("");
  const counts = useCounts(REGION_CHOICES.map((r) => ({ ...s, neighborhood: r.neighborhood, condo: "" })));
  const condoFn = useServerFn(getCondoFacets);
  const condos = useQuery({
    queryKey: ["appCondos", s.purpose, s.type],
    staleTime: 5 * 60_000,
    queryFn: () => condoFn({ data: { purpose: s.purpose, type: s.type } }),
  });
  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const list = useMemo(() => {
    const all = [...(condos.data ?? [])].filter((c) => c.n > 0).sort((a, b) => b.n - a.n);
    const t = norm(q.trim());
    return t ? all.filter((c) => norm(c.name).includes(t)).slice(0, 8) : all.slice(0, 5);
  }, [condos.data, q]);

  return (
    <Question title="Onde?">
      {REGION_CHOICES.map((r, i) => (counts[i] === 0 ? null : (
        <Option key={r.label} icon={<MapPin className="h-6 w-6" />} count={counts[i]} onClick={() => onPick({ neighborhood: r.neighborhood, condo: "", condoName: "" })}>
          {r.label}
        </Option>
      )))}
      <Option muted onClick={() => onPick({ neighborhood: "", condo: "", condoName: "" })}>Todas as regiões</Option>

      <label className="mt-5 text-sm text-white/60" htmlFor="app-condo">Ou digite o condomínio</label>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
        <input
          id="app-condo"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Bellagio, Alphaville 2, Tamboré 1…"
          autoComplete="off"
          className="w-full h-14 rounded-xl bg-white text-[#0D0D0D] pl-12 pr-4 text-lg outline-none"
        />
      </div>
      {!q && list.length > 0 && <p className="text-xs uppercase tracking-widest text-white/40 mt-2">Com mais imóveis</p>}
      {list.map((c) => (
        <Option key={c.id} count={c.n} onClick={() => onPick({ condo: c.slug, condoName: c.name, neighborhood: "" })}>{c.name}</Option>
      ))}
      {q && condos.data && list.length === 0 && <p className="text-sm text-white/50">Nenhum condomínio com esse nome nesta busca.</p>}
    </Question>
  );
}
