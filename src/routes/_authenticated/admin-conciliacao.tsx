import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { runReconciliationNow, approveHeldDeactivationNow, listCodeAlerts } from "@/lib/reconciliation.functions";
import { ReconciliationAlert } from "@/components/admin/reconciliation-alert";

export const Route = createFileRoute("/_authenticated/admin-conciliacao")({
  head: () => ({ meta: [{ title: "Conciliação com o site principal — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

const STATUS: Record<string, string> = { ok: "Concluída", blocked: "Travada (80%)", failed: "Falhou", running: "Rodando", incomplete: "Incompleta (nada desativado)", held: "Aguardando aprovação", stalled: "Travou" };

function Page() {
  const run = useServerFn(runReconciliationNow);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const approve = useServerFn(approveHeldDeactivationNow);
  const codesFn = useServerFn(listCodeAlerts);
  const { data: codeAlerts } = useQuery({ queryKey: ["code-alerts"], queryFn: () => codesFn() });
  async function approveRun(id: string, n: number) {
    if (!confirm(`Desativar ${n} imóveis que saíram da API? Cada um será reconferido antes.`)) return;
    try {
      const r = await approve({ data: { runId: id } });
      setMsg(`Aprovado: ${r.deactivated.length} desativados${r.skipped.length ? ` · ${r.skipped.length} ignorados (voltaram ou já saíram)` : ""}`);
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    qc.invalidateQueries({ queryKey: ["reconciliation-runs"] });
  }
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
    try {
      const r = await run({ data: {} }) as { status: string; error?: string; imported?: number; paused?: number; details?: { updated?: number; deactivated?: { code: string | null }[] } };
      const gone = r.details?.deactivated ?? [];
      setMsg(r.status === "ok"
        ? `Concluída: ${r.imported ?? 0} novos · ${r.details?.updated ?? 0} atualizados · ${gone.length} desativados${gone.length ? ` (${gone.map((g) => g.code).join(", ")})` : ""}`
        : `Execução: ${STATUS[r.status] ?? r.status}${r.error ? ` — ${r.error}` : ""}`);
    }
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
            Roda às 5h e de hora em hora das 7h às 22h, lendo a API da Univen. Atualiza os dados, desativa quem ficou fora
            da API em 2 execuções seguidas (só se a coleta veio completa e com pelo menos 95% da última execução completa; mais de 50 de uma vez aguardam aprovação aqui) (a página passa a levar para a busca do condomínio), reativa quem voltou e importa
            até 30 novos por execução (Barueri e Santana de Parnaíba primeiro). Para se a API trouxer menos de 80% de 2.290 imóveis.
          </p>
        </div>
        <Button onClick={go} disabled={busy}>{busy ? "Sincronizando… (alguns minutos)" : "Sincronizar agora"}</Button>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      {(runs ?? []).filter((r) => r.status === "held" && !r.approved_at).map((r) => {
        const list = (r.pending_deactivation ?? []) as { code: string | null; slug: string }[];
        return (
          <div key={r.id} className="rounded-lg border border-destructive p-4 text-sm space-y-2">
            <p><b>{list.length} imóveis aguardando aprovação para sair</b> (execução de {new Date(r.started_at).toLocaleString("pt-BR")}). Limite automático: 50 por execução.</p>
            <p className="text-xs text-muted-foreground break-words">{list.map((d) => d.code ?? d.slug).join(", ")}</p>
            <Button variant="destructive" size="sm" onClick={() => approveRun(r.id, list.length)}>Aprovar desativação</Button>
          </div>
        );
      })}
      {codeAlerts && (codeAlerts.duplicates.length > 0 || codeAlerts.nonStandard.length > 0) && (
        <div className="rounded-lg border p-4 text-sm space-y-2">
          <p className="font-semibold">Alertas de código</p>
          {codeAlerts.duplicates.length > 0 && (
            <p className="text-destructive"><b>Código repetido em dois imóveis ({codeAlerts.duplicates.length}):</b> {codeAlerts.duplicates.map((d) => `${d.code} (${d.slugs.length})`).join(", ")}</p>
          )}
          {codeAlerts.nonStandard.length > 0 && (
            <div>
              <b>Fora do padrão de 2 letras + 5 dígitos ({codeAlerts.nonStandard.length}):</b>
              <ul className="mt-1 grid gap-x-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                {codeAlerts.nonStandard.map((c) => (
                  <li key={c.slug}><a className="underline" href={`/imoveis/${c.slug}`} target="_blank" rel="noreferrer">{c.code}</a> — {c.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>{["Início", "Origem", "Situação", "Na origem", "Ativos", "Pausados", "Desativou", "Reativou", "Importou", "Juntou", "Atualizou", "Faltando", "Erros"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr>
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
                <td className="p-2" title={((r.details as { deactivated?: { code: string | null }[] } | null)?.deactivated ?? []).map((d) => d.code).join(", ")}>{r.paused}</td>
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
