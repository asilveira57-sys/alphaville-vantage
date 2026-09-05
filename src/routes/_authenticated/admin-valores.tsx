import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { parseValorBR, formatBRLValue } from "@/lib/price-audit/money";
import { MONEY_CASES } from "@/lib/price-audit/money.cases";
import { auditarValores, listarAuditoriaValores } from "@/lib/price-audit.functions";

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
    divergente: "text-red-600 font-semibold",
    ambiguo: "text-amber-700",
    nao_encontrado: "text-muted-foreground",
    fonte_indisponivel: "text-muted-foreground",
    sem_url: "text-muted-foreground",
  };
  return <span className={`text-[11px] uppercase tracking-wider ${map[status] ?? ""}`}>{status}</span>;
}

function AdminValoresPage() {
  const qc = useQueryClient();
  const auditFn = useServerFn(auditarValores);
  const listFn = useServerFn(listarAuditoriaValores);

  const [runId, setRunId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
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
    queryKey: ["priceAudit", runId, statusFilter],
    queryFn: () => listFn({ data: { runId, status: statusFilter } }),
  });

  async function runAudit(opts: { onlySuspects?: boolean; propertyId?: string; single?: boolean }) {
    const id = newRunId();
    setRunId(id);
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
        .or(`external_ref.eq.${CASO_TESTE_ID},internal_code.eq.CA04269`)
        .limit(1);
      const pid = data?.[0]?.id;
      if (!pid) throw new Error("Imóvel 78812960 não encontrado no banco.");
      return runAudit({ propertyId: pid, single: true });
    },
  });

  const running = suspectsMut.isPending || fullMut.isPending || caseMut.isPending;
  const rows = rowsQ.data ?? [];

  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-10">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Administração</p>
            <h1 className="font-serif text-4xl text-ink">Imóveis · Auditoria de Valores</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Compara os valores gravados no portal com os valores publicados na fonte oficial.
              Esta fase é somente de leitura: nada é alterado nos imóveis.
            </p>
          </div>
          <Link to="/admin" className="shrink-0 border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink hover:text-canvas">
            ← Admin
          </Link>
        </div>

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
          <p className="text-xs text-muted-foreground">
            "Suspeitos" traz apenas venda acima de R$ 30 milhões, aluguel acima de R$ 200 mil ou condomínio acima de R$ 50 mil.
          </p>
          {progress && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
              {[
                ["Total", progress.total],
                ["Processados", progress.processed],
                ["Corretos", progress.correto],
                ["Divergentes", progress.divergente],
                ["Ambíguos", progress.ambiguo],
                ["Erros", progress.erros],
              ].map(([label, value]) => (
                <div key={label as string} className="border border-ink/10 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
                  <div className="font-serif text-2xl text-ink">{value as number}</div>
                </div>
              ))}
            </div>
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
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 text-[11px] uppercase tracking-widest border ${
                    statusFilter === key ? "bg-ink text-canvas border-ink" : "border-ink/15 hover:bg-ink/5"
                  }`}
                >
                  {label}
                </button>
              ))}
              {runId && (
                <button onClick={() => setRunId(null)} className="px-3 py-1.5 text-[11px] uppercase tracking-widest border border-ink/15 hover:bg-ink/5">
                  Ver todas as rodadas
                </button>
              )}
            </div>
          </div>

          <div className="border border-ink/10 overflow-x-auto">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-ink/10">
                <div className="col-span-2">Imóvel</div>
                <div className="col-span-1">Campo</div>
                <div className="col-span-2">Valor no banco</div>
                <div className="col-span-2">Texto na fonte</div>
                <div className="col-span-2">Interpretado</div>
                <div className="col-span-1">Proporção</div>
                <div className="col-span-2">Status / links</div>
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
        </section>
      </div>
    </SiteLayout>
  );
}
