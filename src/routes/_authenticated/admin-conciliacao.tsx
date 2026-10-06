import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { runReconciliationNow } from "@/lib/reconciliation.functions";
import { ReconciliationAlert } from "@/components/admin/reconciliation-alert";

export const Route = createFileRoute("/_authenticated/admin-conciliacao")({
  head: () => ({ meta: [{ title: "Conciliação com o site principal — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const STATUS: Record<string, string> = { ok: "Concluída", blocked: "Travada (80%)", failed: "Falhou", running: "Rodando" };

function Page() {
  const run = useServerFn(runReconciliationNow);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { data: runs } = useQuery({
    queryKey: ["reconciliation-runs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("source_reconciliation_runs").select("*").order("started_at", { ascending: false }).limit(60);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function go() {
    setBusy(true); setMsg(null);
    try { const r = await run({ data: {} }); setMsg(`Execução: ${STATUS[r.status] ?? r.status}${r.error ? ` — ${r.error}` : ""}`); }
    catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["reconciliation-runs"] });
    qc.invalidateQueries({ queryKey: ["reconciliation-last"] });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <ReconciliationAlert />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/admin" className="text-sm text-muted-foreground">← Admin</Link>
          <h1 className="text-2xl font-semibold">Conciliação com o site principal</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Roda todo dia às 5h. Casa os imóveis pelo número do anúncio, junta duplicados, atualiza endereços de origem,
            pausa quem ficou 2 dias fora da origem (após abrir a página), reativa quem voltou e importa até 30 novos por dia
            (Barueri e Santana de Parnaíba primeiro). Para se a coleta trouxer menos de 80% de 2.290 imóveis.
          </p>
        </div>
        <Button onClick={go} disabled={busy}>{busy ? "Rodando… (alguns minutos)" : "Rodar agora"}</Button>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>{["Início", "Origem", "Situação", "Na origem", "Ativos", "Pausados", "Pausou", "Reativou", "Importou", "Juntou", "Endereços", "Faltando", "Erros"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(runs ?? []).map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="p-2 whitespace-nowrap">{new Date(r.started_at).toLocaleString("pt-BR")}</td>
                <td className="p-2">{r.triggered_by}</td>
                <td className={`p-2 ${r.status === "ok" ? "" : "text-destructive font-medium"}`}>{STATUS[r.status] ?? r.status}{r.error ? `: ${r.error}` : ""}</td>
                <td className="p-2">{r.origin_count ?? "—"}</td>
                <td className="p-2">{r.portal_active ?? "—"}</td>
                <td className="p-2">{r.portal_paused ?? "—"}</td>
                <td className="p-2">{r.paused}</td>
                <td className="p-2">{r.reactivated}</td>
                <td className="p-2">{r.imported}</td>
                <td className="p-2">{r.merged}</td>
                <td className="p-2">{r.paths_updated}</td>
                <td className="p-2">{r.missing_in_portal ?? "—"}</td>
                <td className="p-2 text-xs">{Array.isArray(r.errors) && r.errors.length ? (r.errors as string[]).slice(0, 5).join(" · ") : "—"}</td>
              </tr>
            ))}
            {runs && !runs.length && <tr><td colSpan={13} className="p-4 text-muted-foreground">Nenhuma execução ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
