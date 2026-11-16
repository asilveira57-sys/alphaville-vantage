import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { listStaffLeads } from "@/lib/corretor.functions";
import { ago, STAGE_STYLE, stageLabel } from "@/components/corretor/stage";

const search = z.object({ aba: z.enum(["meus", "livres", "todos"]).catch("meus").default("meus") });

export const Route = createFileRoute("/corretor/leads/")({
  validateSearch: search,
  component: LeadsPage,
});

function LeadsPage() {
  const { aba } = Route.useSearch();
  const navigate = useNavigate({ from: "/corretor/leads/" });
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);
  const listFn = useServerFn(listStaffLeads);
  const leadsQ = useQuery({ queryKey: ["staffLeads", aba, q], queryFn: () => listFn({ data: { scope: aba, q } }) });
  const counts = leadsQ.data?.counts;

  const tabs = [
    ["meus", `Meus${counts ? ` (${counts.mine})` : ""}`],
    ["livres", `Sem dono${counts ? ` (${counts.free})` : ""}`],
    ["todos", "Todos"],
  ] as const;

  return (
    <div className="px-4 py-5">
      <h1 className="font-serif text-2xl text-ink mb-4">Leads</h1>
      <div className="grid grid-cols-3 border border-ink/15 mb-3">
        {tabs.map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => navigate({ search: { aba: v } })}
            className={`py-2.5 text-[11px] uppercase tracking-widest ${aba === v ? "bg-ink text-canvas" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Buscar por nome, telefone ou assunto"
        className="w-full border border-ink/15 px-3 py-3 text-sm bg-white/60 focus:outline-none focus:border-ink mb-4"
      />
      {leadsQ.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {leadsQ.error && <p className="text-sm text-red-600">{(leadsQ.error as Error).message}</p>}
      <div className="space-y-2">
        {(leadsQ.data?.leads ?? []).map((l) => (
          <Link key={l.id} to="/corretor/leads/$id" params={{ id: l.id }} className="block border border-ink/10 bg-white/60 p-3 active:bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-ink truncate">{l.name || "Sem nome"}</div>
                <div className="text-xs text-muted-foreground truncate">{l.source_label ?? l.source} · {ago(l.created_at)}</div>
              </div>
              <span className={`shrink-0 text-[10px] uppercase tracking-widest px-2 py-0.5 ${STAGE_STYLE[l.stage] ?? "bg-ink/10"}`}>
                {l.owner_user_id ? stageLabel(l.stage) : "Sem dono"}
              </span>
            </div>
            {l.summary && <p className="text-xs text-ink/70 mt-2 line-clamp-2">{l.summary}</p>}
            {aba === "todos" && l.owner_name && <p className="text-[11px] text-muted-foreground mt-1">Com {l.owner_name}</p>}
          </Link>
        ))}
        {leadsQ.isSuccess && leadsQ.data.leads.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {aba === "livres" ? "Nenhum lead sem dono agora." : aba === "meus" ? "Você ainda não pegou nenhum lead." : "Nenhum lead encontrado."}
          </p>
        )}
      </div>
    </div>
  );
}
