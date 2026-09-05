import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { parseValorBR, formatBRLValue } from "@/lib/price-audit/money";
import { MONEY_CASES } from "@/lib/price-audit/money.cases";
import {
  auditarValores,
  listarAuditoriaValores,
  estatisticasValores,
  auditarTextos,
  corrigirTextosValores,
} from "@/lib/price-audit.functions";

export const Route = createFileRoute("/_authenticated/admin-valores")({
  head: () => ({
    meta: [
      { title: "Imóveis · Auditoria de Valores" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminValoresPage,
});

const FIELD_LABEL: Record<string, string> = {
  price_sale: "Venda",
  price_rent: "Aluguel",
  condo_fee: "Condomínio",
  iptu: "IPTU",
  descricao_seo: "Descrição SEO",
  seo_description: "Meta descrição",
};

const STATUS_LABEL: Record<string, string> = {
  todos: "Todos",
  divergente: "Divergentes",
  ambiguo: "Ambíguos",
  correto: "Corretos",
  sem_url: "Sem URL",
  fonte_indisponivel: "Fonte indisponível",
  nao_encontrado: "Não encontrado",
};

const TEXT_STATUS_LABEL: Record<string, string> = {
  todos: "Todos",
  texto_desatualizado: "Textos desatualizados",
  texto_ok: "Textos corretos",
  sem_texto: "Sem texto",
};

const PAGE_SIZES = [25, 50, 100, 200];
const CASO_TESTE_ID = "78812960";

function newRunId() {
  return crypto.randomUUID();
}

function RatioBadge({ ratio }: { ratio: number | null }) {
  if (ratio == null) return <span className="text-muted-foreground">—</span>;
  const near = (n: number) => Math.abs(ratio - n) / n < 0.02;
  const flag = near(1000) ? "1000x" : near(100) ? "100x" : near(10) ? "10x" : null;
  if (flag) {
    return (
      <span className="inline-block bg-red-600 text-white px-2 py-0.5 text-[11px] font-bold tracking-wide">
        {flag} maior
      </span>
    );
  }
  return <span className="text-muted-foreground">{ratio.toLocaleString("pt-BR")}x</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    correto: "text-emerald-700",
    texto_ok: "text-emerald-700",
    divergente: "text-red-600 font-semibold",
    texto_desatualizado: "text-red-600 font-semibold",
    ambiguo: "text-amber-700",
    nao_encontrado: "text-muted-foreground",
    fonte_indisponivel: "text-muted-foreground",
    sem_url: "text-muted-foreground",
    sem_texto: "text-muted-foreground",
  };
  return <span className={`text-[11px] uppercase tracking-wider ${map[status] ?? ""}`}>{status}</span>;
}

function Pager({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const btn = "border border-ink/15 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-ink/5 disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      <button className={btn} disabled={page <= 1} onClick={() => onPage(1)}>« Primeira</button>
      <button className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Anterior</button>
      <span className="text-xs text-muted-foreground">Página {page} de {pages} · {total.toLocaleString("pt-BR")} registros</span>
      <button className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)}>Próxima ›</button>
      <button className={btn} disabled={page >= pages} onClick={() => onPage(pages)}>Última »</button>
      <select
        value={pageSize}
        onChange={(e) => onPageSize(Number(e.target.value))}
        className="border border-ink/15 px-2 py-1.5 text-xs bg-transparent"
      >
        {PAGE_SIZES.map((n) => (
          <option key={n} value={n}>{n} por página</option>
        ))}
      </select>
    </div>
  );
}

function AdminValoresPage() {
  const qc = useQueryClient();
  const auditFn = useServerFn(auditarValores);
  const listFn = useServerFn(listarAuditoriaValores);
  const statsFn = useServerFn(estatisticasValores);
  const textosFn = useServerFn(auditarTextos);
  const fixTextosFn = useServerFn(corrigirTextosValores);

  const [tab, setTab] = useState<"valores" | "textos">("valores");
  const [runId, setRunId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState<string>("ratio");
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>("desc");
  const [showTests, setShowTests] = useState(false);
  const [progress, setProgress] = useState<null | {
    total: number; processed: number; correto: number; divergente: number; ambiguo: number; erros: number;
  }>(null);

  const testResults = useMemo(
    () =>
      MONEY_CASES.map((c) => {
        const r = parseValorBR(c.entrada);
        const ok =
          r.valor === c.esperado &&
          r.ambiguo === c.ambiguo &&
          (c.motivo === undefined || r.motivo === c.motivo);
        return { ...c, obtido: r, ok };
      }),
    [],
  );
  const allGreen = testResults.every((t) => t.ok);

  const rowsQ = useQuery({
    queryKey: ["priceAudit", runId, statusFilter, page, pageSize, sortBy, sortDir],
    queryFn: () =>
      listFn({ data: { runId, status: statusFilter, page, pageSize, sortBy: sortDir ? sortBy : "created_at", sortDir: sortDir ?? "desc" } }),
    enabled: tab === "valores",
  });

  const statsQ = useQuery({
    queryKey: ["priceAuditStats", runId],
    queryFn: () => statsFn({ data: { runId } }),
    enabled: tab === "valores",
  });

  function toggleSort(key: string) {
    setPage(1);
    if (sortBy !== key) { setSortBy(key); setSortDir("desc"); return; }
    if (sortDir === "desc") { setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortBy("ratio"); setSortDir("desc"); return; }
    setSortDir("desc");
  }
  const arrow = (key: string) => (sortBy === key && sortDir ? (sortDir === "desc" ? " ↓" : " ↑") : "");

  async function runAudit(opts: { onlySuspects?: boolean; propertyId?: string }) {
    const id = newRunId();
    setRunId(id);
    setPage(1);
    const totals = { total: 0, processed: 0, correto: 0, divergente: 0, ambiguo: 0, erros: 0 };
    let offset = 0;
    for (let i = 0; i < 400; i++) {
      const res = await auditFn({
        data: { runId: id, limit: 25, offset, onlySuspects: opts.onlySuspects, propertyId: opts.propertyId },
      });
      totals.total = res.total;
      totals.processed += res.stats.processed;
      totals.correto += res.stats.correto;
      totals.divergente += res.stats.divergente;
      totals.ambiguo += res.stats.ambiguo;
      totals.erros += res.stats.erros;
      setProgress({ ...totals });
      offset = res.nextOffset;
      qc.invalidateQueries({ queryKey: ["priceAudit"] });
      qc.invalidateQueries({ queryKey: ["priceAuditStats"] });
      if (!res.hasMore) break;
    }
    return totals;
  }

  const suspectsMut = useMutation({ mutationFn: () => runAudit({ onlySuspects: true }) });
  const fullMut = useMutation({ mutationFn: () => runAudit({}) });
  const caseMut = useMutation({
    mutationFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase
        .from("properties")
        .select("id")
        .or(`source_url.ilike.%${CASO_TESTE_ID}%,external_ref.ilike.%${CASO_TESTE_ID}%`)
        .limit(1);
      const pid = data?.[0]?.id;
      if (!pid) throw new Error("Imóvel 78812960 não encontrado no banco.");
      return runAudit({ propertyId: pid });
    },
  });

  const running = suspectsMut.isPending || fullMut.isPending || caseMut.isPending;
  const rows = rowsQ.data?.rows ?? [];
  const counts = statsQ.data?.counts ?? {};

  /* ------------------------------ Textos ------------------------------ */
  const [tPage, setTPage] = useState(1);
  const [tPageSize, setTPageSize] = useState(50);
  const [tFilter, setTFilter] = useState<string>("texto_desatualizado");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);

  const textosQ = useQuery({
    queryKey: ["textAudit", tPage, tPageSize, tFilter],
    queryFn: () => textosFn({ data: { page: tPage, pageSize: tPageSize, filtro: tFilter } }),
    enabled: tab === "textos",
  });

  const fixMut = useMutation({
    mutationFn: (ids: string[]) => fixTextosFn({ data: { propertyIds: ids } }),
    onSuccess: () => {
      setSelected({});
      qc.invalidateQueries({ queryKey: ["textAudit"] });
    },
  });

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Administração</p>
            <h1 className="font-serif text-4xl text-ink">Imóveis · Auditoria de Valores</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Compara os valores gravados no portal com a fonte oficial e verifica se os textos publicados
              ainda mostram os valores corretos.
            </p>
          </div>
          <Link to="/admin" className="shrink-0 border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink hover:text-canvas">
            ← Admin
          </Link>
        </div>

        <div className="flex gap-2 border-b border-ink/10">
          {([["valores", "Valores"], ["textos", "Textos"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-xs uppercase tracking-widest border-b-2 -mb-px ${
                tab === key ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "valores" && (
          <>
            {/* 1. Interpretador */}
            <section className="border border-ink/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-2xl text-ink">Interpretador monetário</h2>
                <div className="flex items-center gap-3">
                  <span className={`text-xs uppercase tracking-widest ${allGreen ? "text-emerald-700" : "text-red-600"}`}>
                    {allGreen ? `${testResults.length}/${testResults.length} casos OK` : "Falhas encontradas"}
                  </span>
                  <button
                    onClick={() => setShowTests((v) => !v)}
                    className="border border-ink/20 px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink/5"
                  >
                    {showTests ? "Ocultar" : "Testar interpretador"}
                  </button>
                </div>
              </div>
              {showTests && (
                <div className="mt-4 border border-ink/10">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-ink/10">
                    <div className="col-span-4">Entrada</div>
                    <div className="col-span-3">Esperado</div>
                    <div className="col-span-3">Obtido</div>
                    <div className="col-span-2">Resultado</div>
                  </div>
                  {testResults.map((t, i) => (
                    <div key={i} className={`grid grid-cols-12 gap-2 px-3 py-2 text-xs border-b border-ink/5 ${t.ok ? "bg-emerald-50/50" : "bg-red-50"}`}>
                      <div className="col-span-4 font-mono">{t.entrada || "(vazio)"}</div>
                      <div className="col-span-3">{t.esperado == null ? `null · ${t.motivo}` : formatBRLValue(t.esperado)}</div>
                      <div className="col-span-3">{t.obtido.valor == null ? `null · ${t.obtido.motivo}` : formatBRLValue(t.obtido.valor)}</div>
                      <div className={`col-span-2 font-semibold ${t.ok ? "text-emerald-700" : "text-red-600"}`}>{t.ok ? "✓ passou" : "✗ falhou"}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 2. Execução */}
            <section className="border border-ink/10 p-5 space-y-3">
              <h2 className="font-serif text-2xl text-ink">Análise</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={running || !allGreen}
                  onClick={() => suspectsMut.mutate()}
                  className="bg-ink text-canvas px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink/85 disabled:opacity-50"
                >
                  {suspectsMut.isPending ? "Analisando…" : "Analisar suspeitos"}
                </button>
                <button
                  disabled={running || !allGreen}
                  onClick={() => fullMut.mutate()}
                  className="border border-ink/20 px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink/5 disabled:opacity-50"
                >
                  {fullMut.isPending ? "Analisando…" : "Analisar base completa"}
                </button>
                <button
                  disabled={running || !allGreen}
                  onClick={() => caseMut.mutate()}
                  className="border border-ink/20 px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink/5 disabled:opacity-50"
                >
                  {caseMut.isPending ? "Analisando…" : "Caso de teste (78812960)"}
                </button>
              </div>
              {progress && (
                <p className="text-xs text-muted-foreground">
                  Rodada em andamento: {progress.processed} imóveis processados de {progress.total}.
                </p>
              )}
              {statsQ.data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    ["Imóveis analisados", statsQ.data.imoveisAnalisados],
                    ["Campos verificados", statsQ.data.camposVerificados],
                    ["Campos divergentes", counts.divergente ?? 0],
                    ["Imóveis com divergência", statsQ.data.imoveisComDivergencia],
                  ].map(([label, value]) => (
                    <div key={label as string} className="border border-ink/10 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
                      <div className="font-serif text-2xl text-ink">{(value as number).toLocaleString("pt-BR")}</div>
                    </div>
                  ))}
                </div>
              )}
              {statsQ.data && (
                <p className="text-xs text-muted-foreground">
                  Campos corretos: {(counts.correto ?? 0).toLocaleString("pt-BR")} · divergentes:{" "}
                  {(counts.divergente ?? 0).toLocaleString("pt-BR")} · ambíguos: {(counts.ambiguo ?? 0).toLocaleString("pt-BR")} ·
                  erros: {((counts.sem_url ?? 0) + (counts.fonte_indisponivel ?? 0)).toLocaleString("pt-BR")}
                </p>
              )}
              {[suspectsMut, fullMut, caseMut].map((m, i) =>
                m.error ? <p key={i} className="text-xs text-red-600">{(m.error as Error).message}</p> : null,
              )}
            </section>

            {/* 3. Resultados */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-2xl text-ink">Resultados</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABEL).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setStatusFilter(key); setPage(1); }}
                      className={`px-3 py-1.5 text-[11px] uppercase tracking-widest border ${
                        statusFilter === key ? "bg-ink text-canvas border-ink" : "border-ink/15 hover:bg-ink/5"
                      }`}
                    >
                      {label} ({(counts[key] ?? 0).toLocaleString("pt-BR")})
                    </button>
                  ))}
                  {runId && (
                    <button onClick={() => { setRunId(null); setPage(1); }} className="px-3 py-1.5 text-[11px] uppercase tracking-widest border border-ink/15 hover:bg-ink/5">
                      Ver todas as rodadas
                    </button>
                  )}
                </div>
              </div>

              <div className="border border-ink/10 overflow-x-auto">
                <div className="min-w-[1000px]">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-ink/10">
                    <div className="col-span-2">Imóvel</div>
                    <button className="col-span-1 text-left uppercase" onClick={() => toggleSort("field")}>Campo{arrow("field")}</button>
                    <button className="col-span-2 text-left uppercase" onClick={() => toggleSort("current_value")}>Valor no banco{arrow("current_value")}</button>
                    <div className="col-span-2">Texto na fonte</div>
                    <button className="col-span-2 text-left uppercase" onClick={() => toggleSort("found_value")}>Interpretado{arrow("found_value")}</button>
                    <button className="col-span-1 text-left uppercase" onClick={() => toggleSort("ratio")}>Proporção{arrow("ratio")}</button>
                    <button className="col-span-2 text-left uppercase" onClick={() => toggleSort("status")}>Status / links{arrow("status")}</button>
                  </div>
                  {rowsQ.isLoading && <div className="px-4 py-8 text-sm text-muted-foreground text-center">Carregando…</div>}
                  {!rowsQ.isLoading && rows.length === 0 && (
                    <div className="px-4 py-8 text-sm text-muted-foreground text-center">Nenhuma linha de auditoria ainda.</div>
                  )}
                  {rows.map((r: any) => (
                    <div key={r.id} className="grid grid-cols-12 gap-2 px-3 py-3 text-xs border-b border-ink/5 items-start">
                      <div className="col-span-2 min-w-0">
                        <div className="font-medium text-ink">{r.property?.internal_code ?? "—"}</div>
                        <div className="text-muted-foreground line-clamp-2">{r.property?.title ?? "—"}</div>
                      </div>
                      <div className="col-span-1">{FIELD_LABEL[r.field] ?? r.field}</div>
                      <div className="col-span-2 font-mono">{formatBRLValue(r.current_value)}</div>
                      <div className="col-span-2 font-mono text-muted-foreground">{r.found_raw ?? "—"}</div>
                      <div className="col-span-2 font-mono">{formatBRLValue(r.found_value)}</div>
                      <div className="col-span-1"><RatioBadge ratio={r.ratio} /></div>
                      <div className="col-span-2 space-y-1">
                        <StatusBadge status={r.status} />
                        {r.reason && <div className="text-[11px] text-amber-800">{r.reason}</div>}
                        <div className="flex flex-wrap gap-2">
                          {r.source_url && (
                            <a href={r.source_url} target="_blank" rel="noreferrer" className="underline text-ink">Ver anúncio oficial</a>
                          )}
                          {r.property?.slug && (
                            <a href={`/imoveis/${r.property.slug}`} target="_blank" rel="noreferrer" className="underline text-ink">Ver no portal</a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Pager
                page={page}
                pageSize={pageSize}
                total={rowsQ.data?.total ?? 0}
                onPage={setPage}
                onPageSize={(n) => { setPageSize(n); setPage(1); }}
              />
            </section>
          </>
        )}

        {tab === "textos" && (
          <section className="space-y-4">
            <div className="border border-ink/10 p-5 space-y-2">
              <h2 className="font-serif text-2xl text-ink">Valores congelados nos textos</h2>
              <p className="text-sm text-muted-foreground max-w-3xl">
                Confere, sem acessar a internet, se os valores citados na descrição publicada e na meta descrição
                ainda batem com os valores cadastrados. A correção regera apenas o parágrafo de valores —
                o restante do texto permanece idêntico.
              </p>
              {textosQ.data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2">
                  {[
                    ["Imóveis verificados", textosQ.data.stats.total],
                    ["Textos desatualizados", textosQ.data.stats.texto_desatualizado],
                    ["Textos corretos", textosQ.data.stats.texto_ok],
                    ["Sem texto", textosQ.data.stats.sem_texto],
                  ].map(([label, value]) => (
                    <div key={label as string} className="border border-ink/10 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
                      <div className="font-serif text-2xl text-ink">{(value as number).toLocaleString("pt-BR")}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {Object.entries(TEXT_STATUS_LABEL).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setTFilter(key); setTPage(1); }}
                    className={`px-3 py-1.5 text-[11px] uppercase tracking-widest border ${
                      tFilter === key ? "bg-ink text-canvas border-ink" : "border-ink/15 hover:bg-ink/5"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{selectedIds.length} selecionados</span>
                <button
                  disabled={!selectedIds.length || fixMut.isPending}
                  onClick={() => {
                    if (confirm(`Corrigir o parágrafo de valores de ${selectedIds.length} imóvel(is)?`)) fixMut.mutate(selectedIds);
                  }}
                  className="bg-ink text-canvas px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink/85 disabled:opacity-50"
                >
                  {fixMut.isPending ? "Corrigindo…" : "Corrigir selecionados"}
                </button>
              </div>
            </div>
            {fixMut.data && (
              <p className="text-xs text-emerald-700">
                {fixMut.data.aplicados} texto(s) corrigido(s).
                {fixMut.data.results.filter((r) => !r.ok).length > 0 &&
                  ` ${fixMut.data.results.filter((r) => !r.ok).length} exigem revisão manual.`}
              </p>
            )}
            {fixMut.error && <p className="text-xs text-red-600">{(fixMut.error as Error).message}</p>}

            <div className="border border-ink/10">
              {textosQ.isLoading && <div className="px-4 py-8 text-sm text-muted-foreground text-center">Carregando…</div>}
              {!textosQ.isLoading && (textosQ.data?.rows.length ?? 0) === 0 && (
                <div className="px-4 py-8 text-sm text-muted-foreground text-center">Nada encontrado neste filtro.</div>
              )}
              {(textosQ.data?.rows ?? []).map((r) => (
                <div key={r.id} className="border-b border-ink/5 px-3 py-3 text-xs space-y-2">
                  <div className="flex flex-wrap items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      disabled={!r.aplicavel}
                      checked={!!selected[r.id]}
                      onChange={(e) => setSelected((s) => ({ ...s, [r.id]: e.target.checked }))}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-ink">{r.internal_code ?? "—"} · {r.title}</div>
                      <div className="flex flex-wrap gap-3 mt-1">
                        <StatusBadge status={r.status} />
                        <a href={`/imoveis/${r.slug}`} target="_blank" rel="noreferrer" className="underline text-ink">Ver no portal</a>
                      </div>
                    </div>
                  </div>
                  {r.issues.length > 0 && (
                    <div className="pl-7 space-y-1">
                      {r.issues.map((i, k) => (
                        <div key={k} className="flex flex-wrap gap-3 font-mono">
                          <span className="text-muted-foreground">{FIELD_LABEL[i.text_field]}</span>
                          <span>{i.label}: texto {i.found_raw}</span>
                          <span>banco {formatBRLValue(i.current_value)}</span>
                          <RatioBadge ratio={i.ratio} />
                        </div>
                      ))}
                    </div>
                  )}
                  {r.antes && r.depois && (
                    <div className="pl-7 grid md:grid-cols-2 gap-2">
                      <div className="bg-red-50 p-2 font-mono">ANTES: {r.antes}</div>
                      <div className="bg-emerald-50 p-2 font-mono">DEPOIS: {r.depois}</div>
                    </div>
                  )}
                  {!r.aplicavel && r.motivo && <div className="pl-7 text-amber-800">{r.motivo}</div>}
                </div>
              ))}
            </div>
            <Pager
              page={tPage}
              pageSize={tPageSize}
              total={textosQ.data?.total ?? 0}
              onPage={setTPage}
              onPageSize={(n) => { setTPageSize(n); setTPage(1); }}
            />
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
