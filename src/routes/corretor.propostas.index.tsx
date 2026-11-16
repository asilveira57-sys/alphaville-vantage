import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listProposals, proposalUrl, proposalWhatsappHref, renewProposal } from "@/lib/proposals.functions";
import { useCorretorSession } from "@/components/corretor/session";
import { SummaryButton } from "@/components/proposals/summary-button";

export const Route = createFileRoute("/corretor/propostas/")({
  component: PropostasApp,
});

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—");

function PropostasApp() {
  const s = useCorretorSession();
  const listFn = useServerFn(listProposals);
  const renewFn = useServerFn(renewProposal);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["proposals"], queryFn: () => listFn() });
  const [onlyMine, setOnlyMine] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const renew = useMutation({ mutationFn: (id: string) => renewFn({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }) });
  const rows = (q.data ?? []).filter((p) => !onlyMine || p.broker_user_id === s.userId);

  return (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-serif text-2xl text-ink">Propostas</h1>
        <Link to="/corretor/propostas/$id" params={{ id: "nova" }} className="bg-[#F2DA00] text-[#0D0D0D] px-3 py-2 text-[11px] uppercase tracking-widest font-semibold">
          + Nova
        </Link>
      </div>
      <div className="grid grid-cols-2 border border-ink/15 mb-4">
        {([[true, "Minhas"], [false, "Todas"]] as const).map(([v, label]) => (
          <button key={label} type="button" onClick={() => setOnlyMine(v)} className={`py-2.5 text-[11px] uppercase tracking-widest ${onlyMine === v ? "bg-ink text-canvas" : ""}`}>
            {label}
          </button>
        ))}
      </div>
      {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {q.error && <p className="text-sm text-red-600">{(q.error as Error).message}</p>}
      <div className="space-y-2">
        {rows.map((p) => {
          const expired = new Date(p.expires_at).getTime() < Date.now();
          const mine = p.broker_user_id === s.userId;
          return (
            <div key={p.id} className="border border-ink/10 bg-white/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-ink truncate">{p.client_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.items} {p.items === 1 ? "imóvel" : "imóveis"} · {fmt(p.created_at)}
                    {!mine && ` · ${p.broker_name}`}
                  </div>
                </div>
                <div className="text-right text-[11px] shrink-0">
                  <div className={expired ? "text-red-600" : "text-emerald-700"}>{expired ? "Vencida" : `Até ${fmt(p.expires_at)}`}</div>
                  <div className="text-muted-foreground">{p.view_count > 0 ? `Aberta ${p.view_count}x` : "Não aberta"}</div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mt-3 text-[10px] uppercase tracking-widest">
                <SummaryButton proposal={p} label="Resumo" className="text-center bg-[#25D366] text-white py-2.5 uppercase tracking-widest" />
                <a href={proposalWhatsappHref(p)} target="_blank" rel="noreferrer" className="text-center border border-[#25D366] text-[#128C4B] py-2.5">
                  Link
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(proposalUrl(p.token));
                    setCopied(p.id);
                    setTimeout(() => setCopied(null), 1500);
                  }}
                  className="border border-ink/20 py-2.5"
                >
                  {copied === p.id ? "Copiado" : "Copiar"}
                </button>
                <a href={`/proposta/${p.token}`} target="_blank" rel="noreferrer" className="text-center border border-ink/20 py-2.5">
                  Ver
                </a>
                {mine || s.isAdmin ? (
                  expired ? (
                    <button type="button" onClick={() => renew.mutate(p.id)} className="border border-ink/20 py-2.5">
                      +14 dias
                    </button>
                  ) : (
                    <Link to="/corretor/propostas/$id" params={{ id: p.id }} className="text-center border border-ink/20 py-2.5">
                      Editar
                    </Link>
                  )
                ) : (
                  <span />
                )}
              </div>
            </div>
          );
        })}
        {q.isSuccess && rows.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">{onlyMine ? "Você ainda não enviou propostas." : "Nenhuma proposta ainda."}</p>
        )}
      </div>
    </div>
  );
}
