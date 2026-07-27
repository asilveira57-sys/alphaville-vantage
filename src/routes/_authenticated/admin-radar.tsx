import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listRadarLeads, updateRadarLeadStatus } from "@/lib/radar.functions";
import { RADAR_STATUSES, interestLabel } from "@/lib/radar-config";

export const Route = createFileRoute("/_authenticated/admin-radar")({
  head: () => ({
    meta: [
      { title: "Leads do Radar — Admin S.A. Imóveis" },
      { name: "description", content: "Painel interno de leads qualificados capturados pelo Radar S.A. Imóveis." },
      { property: "og:title", content: "Leads do Radar — Admin S.A. Imóveis" },
      { property: "og:description", content: "Painel interno de leads qualificados capturados pelo Radar S.A. Imóveis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: RadarLeadsPage,
});

const PRIORITY_STYLE: Record<string, string> = {
  high: "bg-[#F2DA00] text-[#0D0D0D]",
  medium: "bg-[#0D0D0D] text-white",
  initial: "bg-black/10 text-[#0D0D0D]",
};

function RadarLeadsPage() {
  const fetchLeads = useServerFn(listRadarLeads);
  const updateStatus = useServerFn(updateRadarLeadStatus);
  const qc = useQueryClient();
  const [priority, setPriority] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["radar-leads"], queryFn: () => fetchLeads() });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: string }) => updateStatus({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["radar-leads"] }),
  });

  const leads = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((l) => {
      if (priority !== "all" && l.priority_level !== priority) return false;
      if (!q) return true;
      return [l.lead_name, l.lead_phone, l.lead_email, l.interest_type]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, priority, search]);

  return (
    <div className="min-h-screen bg-canvas text-ink px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-ink/50">Admin</p>
            <h1 className="font-display text-3xl md:text-4xl font-medium">Leads do Radar</h1>
          </div>
          <Link to="/admin" className="border border-ink px-4 py-2 text-xs uppercase tracking-widest hover:bg-ink hover:text-canvas">
            ← Painel
          </Link>
        </div>

        <div className="mt-8 flex gap-3 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone, e-mail"
            className="flex-1 min-w-[240px] border border-ink/20 bg-white px-4 py-2 text-sm outline-none focus:border-ink"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="border border-ink/20 bg-white px-4 py-2 text-sm"
          >
            <option value="all">Todas as prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="initial">Inicial</option>
          </select>
        </div>

        <div className="mt-6 border border-ink/10 bg-white">
          {isLoading ? (
            <p className="p-6 text-sm text-ink/60">Carregando leads…</p>
          ) : leads.length === 0 ? (
            <p className="p-6 text-sm text-ink/60">Nenhum lead encontrado.</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {leads.map((l) => (
                <li key={l.id} className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium">{l.lead_name}</span>
                        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest ${PRIORITY_STYLE[l.priority_level ?? "initial"] ?? PRIORITY_STYLE.initial}`}>
                          {l.priority_level ?? "initial"} · {l.qualification_score ?? 0}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink/60">
                        {interestLabel(l.interest_type)} · {l.lead_phone ?? "—"} · {l.lead_email ?? "—"}
                      </p>
                      {l.profile_summary ? (
                        <p className="mt-2 text-sm text-ink/75 max-w-[70ch]">{l.profile_summary}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={l.status ?? RADAR_STATUSES[0].value}
                        onChange={(e) => mutation.mutate({ id: l.id, status: e.target.value })}
                        className="border border-ink/20 bg-white px-3 py-2 text-xs"
                      >
                        {RADAR_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}

                      </select>
                      <button
                        type="button"
                        onClick={() => setOpenId(openId === l.id ? null : l.id)}
                        className="border border-ink px-3 py-2 text-xs uppercase tracking-widest hover:bg-ink hover:text-canvas"
                      >
                        {openId === l.id ? "Fechar" : "Detalhes"}
                      </button>
                    </div>
                  </div>
                  {openId === l.id ? (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-canvas p-4 text-xs">
                      {Object.entries((l.answers_json ?? {}) as Record<string, unknown>).map(([k, v]) => (
                        <div key={k}>
                          <span className="uppercase tracking-widest text-ink/50">{k}</span>
                          <p className="text-ink">{Array.isArray(v) ? v.join(", ") : String(v ?? "—")}</p>
                        </div>
                      ))}
                      {l.recommended_next_step ? (
                        <div className="sm:col-span-2">
                          <span className="uppercase tracking-widest text-ink/50">Próximo passo</span>
                          <p className="text-ink">{l.recommended_next_step}</p>
                        </div>
                      ) : null}
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
