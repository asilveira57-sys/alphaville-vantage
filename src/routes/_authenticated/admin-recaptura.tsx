import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { simulateRecrawlBatch, type RecrawlSimRow } from "@/lib/recrawl-simulation.functions";

export const Route = createFileRoute("/_authenticated/admin-recaptura")({
  head: () => ({ meta: [{ title: "Recaptura (simulação) — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const BATCH = 20;
const fmt = (v: unknown) => (v == null || v === "" ? "—" : String(v));
const cell = (v: unknown) => `"${fmt(v).replace(/"/g, '""')}"`;

function Page() {
  const sim = useServerFn(simulateRecrawlBatch);
  const [rows, setRows] = useState<RecrawlSimRow[]>([]);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [onlyChanged, setOnlyChanged] = useState(true);
  const stop = useRef(false);

  async function run() {
    setRunning(true); setErr(null); setRows([]); stop.current = false;
    try {
      let offset = 0, t = Infinity;
      while (offset < t && !stop.current) {
        const r = await sim({ data: { offset, limit: BATCH } });
        t = r.total; setTotal(r.total);
        setRows((p) => [...p, ...r.rows]);
        offset += BATCH;
      }
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setRunning(false);
  }

  const summary = useMemo(() => {
    const byField: Record<string, number> = {};
    let changed = 0, unavailable = 0, overrides = 0;
    for (const r of rows) {
      if (r.status === "mudaria") changed++;
      if (r.status === "indisponivel") unavailable++;
      overrides += r.skippedOverrides.length;
      for (const c of r.changes) byField[c.field] = (byField[c.field] ?? 0) + 1;
    }
    return { changed, unavailable, overrides, byField: Object.entries(byField).sort((a, b) => b[1] - a[1]) };
  }, [rows]);

  function downloadCsv() {
    const lines = ["id;url;status;campo;antes;depois"];
    for (const r of rows) {
      if (!r.changes.length) lines.push([r.id, r.url, r.status, "", "", ""].map(cell).join(";"));
      for (const c of r.changes) lines.push([r.id, r.url, r.status, c.field, c.before, c.after].map(cell).join(";"));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `recaptura-simulacao-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const shown = onlyChanged ? rows.filter((r) => r.changes.length) : rows;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin" className="text-sm text-muted-foreground">← Admin</Link>
          <h1 className="text-2xl font-semibold">Recaptura — simulação</h1>
          <p className="text-sm text-muted-foreground">Lê a ficha de cada anúncio na origem e mostra o que mudaria. Nada é gravado. Ajustes manuais, vínculo de condomínio e endereço da página não são considerados.</p>
        </div>
        <div className="flex gap-2">
          {running
            ? <Button variant="outline" onClick={() => { stop.current = true; }}>Parar</Button>
            : <Button onClick={run}>Rodar simulação</Button>}
          <Button variant="outline" disabled={!rows.length} onClick={downloadCsv}>Baixar CSV</Button>
        </div>
      </div>
      {err && <p className="text-destructive text-sm">Erro: {err}</p>}
      {rows.length > 0 && (
        <div className="rounded-lg border p-4 text-sm space-y-2">
          <p>Lidos {rows.length}{total ? ` de ${total}` : ""}{running ? " (rodando…)" : ""} · Mudariam: <b>{summary.changed}</b> · Indisponíveis na origem: {summary.unavailable} · Ajustes manuais preservados: {summary.overrides}</p>
          <div className="flex flex-wrap gap-2">
            {summary.byField.map(([f, n]) => <span key={f} className="rounded bg-muted px-2 py-0.5">{f}: {n}</span>)}
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} /> Só imóveis que mudariam</label>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left"><tr><th className="p-2">Código</th><th className="p-2">Situação</th><th className="p-2">Campos (antes → depois)</th></tr></thead>
          <tbody>
            {shown.slice(0, 500).map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-2"><a href={r.url} target="_blank" rel="noreferrer" className="underline">{r.url.split("/").pop()}</a></td>
                <td className="p-2">{r.status}</td>
                <td className="p-2 space-y-0.5">
                  {r.changes.map((c) => <div key={c.field}><b>{c.field}</b>: {fmt(c.before)} → {fmt(c.after)}</div>)}
                  {r.skippedOverrides.length > 0 && <div className="text-muted-foreground">Preservados (manual): {r.skippedOverrides.join(", ")}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length > 500 && <p className="p-2 text-xs text-muted-foreground">Mostrando 500 de {shown.length}. Baixe o CSV para ver todos.</p>}
      </div>
    </div>
  );
}
