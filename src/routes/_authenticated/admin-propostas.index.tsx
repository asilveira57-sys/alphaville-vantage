import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { AdminGate, AdminPageHeader } from "@/components/admin/admin-gate";
import { deleteProposal, listProposals, proposalUrl, renewProposal, proposalWhatsappHref, type ProposalListRow } from "@/lib/proposals.functions";

export const Route = createFileRoute("/_authenticated/admin-propostas/")({
  head: () => ({ meta: [{ title: "Admin · Propostas — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (
    <AdminGate>
      <PropostasPage />
    </AdminGate>
  ),
});

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");


function PropostasPage() {
  const listFn = useServerFn(listProposals);
  const q = useQuery({ queryKey: ["proposals"], queryFn: () => listFn() });
  const [broker, setBroker] = useState("");
  const brokers = useMemo(() => [...new Map((q.data ?? []).map((p) => [p.broker_user_id, p.broker_name])).entries()], [q.data]);
  const rows = (q.data ?? []).filter((p) => !broker || p.broker_user_id === broker);

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-14">
        <AdminPageHeader eyebrow="Leads" title="Propostas">
          <Link to="/admin-propostas/$id" params={{ id: "nova" }} className="bg-[#F2DA00] text-[#0D0D0D] px-5 py-2.5 text-xs uppercase tracking-widest font-medium hover:brightness-95">
            + Nova proposta
          </Link>
        </AdminPageHeader>

        {brokers.length > 1 && (
          <select value={broker} onChange={(e) => setBroker(e.target.value)} className="border border-ink/15 px-3 py-2 text-sm bg-transparent mb-6">
            <option value="">Todos os corretores</option>
            {brokers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}

        {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {q.error && <p className="text-sm text-red-600">{(q.error as Error).message}</p>}

        <div className="border border-ink/10">
          {rows.map((p) => <Row key={p.id} p={p} />)}
          {!q.isLoading && rows.length === 0 && (
            <div className="px-4 py-10 text-sm text-muted-foreground text-center">Nenhuma proposta ainda.</div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}

function Row({ p }: { p: ProposalListRow }) {
  const qc = useQueryClient();
  const delFn = useServerFn(deleteProposal);
  const renewFn = useServerFn(renewProposal);
  const [copied, setCopied] = useState(false);
  const expired = new Date(p.expires_at).getTime() < Date.now();
  const del = useMutation({ mutationFn: () => delFn({ data: { id: p.id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }) });
  const renew = useMutation({ mutationFn: () => renewFn({ data: { id: p.id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }) });

  const copy = async () => {
    await navigator.clipboard.writeText(proposalUrl(p.token));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const btn = "border border-ink/20 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-ink/5 disabled:opacity-50";

  return (
    <div className="px-4 py-3 border-b border-ink/8 text-sm flex flex-wrap items-center gap-x-6 gap-y-2">
      <div className="flex-1 min-w-[220px]">
        <div className="font-medium text-ink">{p.client_name}</div>
        <div className="text-xs text-muted-foreground">
          {p.broker_name} · {p.items} {p.items === 1 ? "imóvel" : "imóveis"} · criada {fmt(p.created_at)}
        </div>
      </div>
      <div className="text-xs w-48">
        <span className={expired ? "text-red-600" : "text-emerald-700"}>{expired ? "Vencida" : "Ativa"}</span>
        <span className="text-muted-foreground"> · vence {fmt(p.expires_at)}</span>
        <div className="text-muted-foreground">
          {p.view_count > 0 ? `Aberta ${p.view_count}x · última ${fmt(p.last_viewed_at)}` : "Ainda não aberta"}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={proposalWhatsappHref(p)} target="_blank" rel="noreferrer" className={`${btn} bg-[#25D366]/10`}>WhatsApp</a>
        <button type="button" onClick={copy} className={btn}>{copied ? "Copiado!" : "Copiar link"}</button>
        <a href={`/proposta/${p.token}`} target="_blank" rel="noreferrer" className={btn}>Ver</a>
        <Link to="/admin-propostas/$id" params={{ id: p.id }} className={btn}>Editar</Link>
        {expired && <button type="button" onClick={() => renew.mutate()} disabled={renew.isPending} className={btn}>+14 dias</button>}
        <button
          type="button"
          disabled={del.isPending}
          onClick={() => window.confirm(`Excluir a proposta de ${p.client_name}? O link deixa de abrir.`) && del.mutate()}
          className="border border-red-300 text-red-700 px-3 py-1.5 text-[11px] uppercase tracking-widest hover:bg-red-50 disabled:opacity-50"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}
