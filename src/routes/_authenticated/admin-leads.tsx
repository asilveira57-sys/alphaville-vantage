import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listLeads, setLeadStatus, type LeadRow } from "@/lib/leads.functions";

export const Route = createFileRoute("/_authenticated/admin-leads")({
  head: () => ({
    meta: [
      { title: "Leads (CRM) — Admin S.A. Imóveis" },
      { name: "description", content: "Todos os contatos recebidos pelos formulários do portal." },
      { property: "og:title", content: "Leads (CRM) — Admin S.A. Imóveis" },
      { property: "og:description", content: "Todos os contatos recebidos pelos formulários do portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: LeadsPage,
});

const SOURCE_STYLE: Record<string, string> = {
  radar: "bg-[#F2DA00] text-[#0D0D0D]",
  pesquisa: "bg-[#0D0D0D] text-white",
  financiamento: "bg-emerald-700 text-white",
  newsletter: "bg-sky-700 text-white",
  oportunidades: "bg-orange-600 text-white",
  parceiro: "bg-violet-700 text-white",
  empreendimento: "bg-violet-700 text-white",
};

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const waLink = (p: string) => {
  const d = p.replace(/\D/g, "");
  return `https://wa.me/${d.startsWith("55") ? d : "55" + d}`;
};

function toCsv(rows: LeadRow[]) {
  const head = ["data", "origem", "nome", "telefone", "email", "pagina", "resumo", "status", "atendido_em"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [new Date(r.created_at).toLocaleString("pt-BR"), r.source_label, r.name, r.phone, r.email, r.landing_page, r.summary, r.status, r.handled_at ? new Date(r.handled_at).toLocaleString("pt-BR") : ""]
      .map(esc)
      .join(";"),
  );
  return "\uFEFF" + [head.map(esc).join(";"), ...lines].join("\r\n");
}

function LeadsPage() {
  const fetchLeads = useServerFn(listLeads);
  const updateStatus = useServerFn(setLeadStatus);
  const qc = useQueryClient();
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data = [], isLoading, error } = useQuery({ queryKey: ["crm-leads"], queryFn: () => fetchLeads() });

  const mutation = useMutation({
    mutationFn: (v: { id: string; status: "pendente" | "atendido" }) => updateStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-leads"] }),
  });

  const sources = useMemo(() => {
    const m = new Map<string, number>();
    data.forEach((l) => m.set(l.source_label, (m.get(l.source_label) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  const leads = useMemo(() => {
    const q = norm(search.trim());
    return data.filter((l) => {
      if (source !== "all" && l.source_label !== source) return false;
      if (status !== "all" && l.status !== status) return false;
      const day = l.created_at.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (!q) return true;
      return [l.name, l.phone, l.email, l.summary].some((v) => v && norm(v).includes(q));
    });
  }, [data, source, status, search, from, to]);

  const pend = data.filter((l) => l.status === "pendente").length;

  const exportCsv = () => {
    const blob = new Blob([toCsv(leads)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const input = "border border-ink/20 bg-white px-3 py-2 text-sm outline-none focus:border-ink";

  return (
    <div className="min-h-screen bg-canvas text-ink px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-ink/50">Admin</p>
            <h1 className="font-display text-3xl md:text-4xl font-medium">Leads (CRM)</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCsv} disabled={!leads.length} className="bg-ink text-canvas px-4 py-2 text-xs uppercase tracking-widest disabled:opacity-50">
              Exportar CSV ({leads.length})
            </button>
            <Link to="/admin" className="border border-ink px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink hover:text-canvas">← Painel</Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 max-w-xl">
          {[["Total", data.length], ["Pendentes", pend], ["Atendidos", data.length - pend]].map(([k, v]) => (
            <div key={k} className="bg-white border border-ink/10 p-4">
              <p className="text-[10px] uppercase tracking-widest text-ink/50">{k}</p>
              <p className="text-2xl font-medium">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {sources.map(([label, n]) => (
            <button key={label} onClick={() => setSource(source === label ? "all" : label)} className={`border px-2 py-1 ${source === label ? "border-ink bg-ink text-canvas" : "border-ink/20 bg-white"}`}>
              {label} ({n})
            </button>
          ))}
        </div>

        <div className="mt-6 flex gap-3 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, telefone, e-mail" className={`${input} flex-1 min-w-[240px]`} />
          <select value={source} onChange={(e) => setSource(e.target.value)} className={input}>
            <option value="all">Todas as origens</option>
            {sources.map(([l]) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
            <option value="all">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="atendido">Atendido</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={input} aria-label="De" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={input} aria-label="Até" />
        </div>

        <div className="mt-6 border border-ink/10 bg-white">
          {isLoading ? (
            <p className="p-6 text-sm text-ink/60">Carregando leads…</p>
          ) : error ? (
            <p className="p-6 text-sm text-red-700">{(error as Error).message}</p>
          ) : leads.length === 0 ? (
            <p className="p-6 text-sm text-ink/60">Nenhum lead encontrado.</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {leads.map((l) => (
                <li key={l.id} className={`p-5 ${l.status === "atendido" ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-4 flex-wrap">
                    <label className="flex items-center gap-2 text-xs uppercase tracking-widest cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#0D0D0D]"
                        checked={l.status === "atendido"}
                        disabled={mutation.isPending}
                        onChange={(e) => mutation.mutate({ id: l.id, status: e.target.checked ? "atendido" : "pendente" })}
                      />
                      {l.status === "atendido" ? "Atendido" : "Pendente"}
                    </label>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium">{l.name || "(sem nome)"}</span>
                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest ${SOURCE_STYLE[l.source] ?? "bg-black/10"}`}>{l.source_label}</span>
                        <span className="text-xs text-ink/50">{new Date(l.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                      <p className="mt-1 text-xs text-ink/70">
                        {l.phone ? <a className="underline" href={waLink(l.phone)} target="_blank" rel="noreferrer">{l.phone}</a> : "—"}
                        {" · "}
                        {l.email ? <a className="underline" href={`mailto:${l.email}`}>{l.email}</a> : "—"}
                        {l.landing_page ? <> · <span className="text-ink/50">{l.landing_page.slice(0, 80)}</span></> : null}
                      </p>
                      {l.summary ? <p className="mt-2 text-sm text-ink/75 max-w-[80ch]">{l.summary}</p> : null}
                    </div>
                    <button onClick={() => setOpenId(openId === l.id ? null : l.id)} className="border border-ink px-3 py-2 text-xs uppercase tracking-widest hover:bg-ink hover:text-canvas">
                      {openId === l.id ? "Fechar" : "Detalhes"}
                    </button>
                  </div>
                  {openId === l.id ? (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-canvas p-4 text-xs">
                      {Object.entries(l.payload ?? {})
                        .filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && !v.length))
                        .map(([k, v]) => (
                          <div key={k} className="min-w-0">
                            <span className="uppercase tracking-widest text-ink/50">{k}</span>
                            <p className="text-ink break-words">{typeof v === "object" ? JSON.stringify(v) : String(v)}</p>
                          </div>
                        ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
