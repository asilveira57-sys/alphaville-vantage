import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import {
  listSubscribers,
  markBroadcastAdded,
  unsubscribeSubscriber,
  AUDIENCE_LABEL,
  type SubscriberRow,
} from "@/lib/opportunity-subscribers.functions";

export const Route = createFileRoute("/_authenticated/admin-lista-oportunidades")({
  head: () => ({
    meta: [
      { title: "Admin · Lista de oportunidades — Portal S.A" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminListaOportunidades,
});

const btn =
  "border border-ink/20 px-3 py-1.5 text-[10px] uppercase tracking-widest hover:bg-ink/5 disabled:opacity-40";
const btnPrimary =
  "bg-brand-yellow text-brand-dark px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:brightness-95 disabled:opacity-40";

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

/** (11) 99999-9999 a partir de 5511999999999. */
function prettyPhone(phone: string | null) {
  if (!phone) return "—";
  const d = phone.startsWith("55") ? phone.slice(2) : phone;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Exporta a lista para alimentar a transmissão à mão.
 *
 * O arquivo leva as colunas de consentimento junto com o contato: é o
 * registro que responde "quando e a quê essa pessoa disse sim".
 */
function downloadCsv(rows: SubscriberRow[]) {
  const header = [
    "nome",
    "email",
    "telefone",
    "perfil",
    "aceitou_email",
    "aceitou_whatsapp",
    "data_do_aceite",
    "versao_da_politica",
    "texto_do_aceite",
    "regioes",
    "tipos",
    "ja_na_lista_em",
    "cadastro_em",
  ].join(";");

  const lines = rows.map((r) =>
    [
      r.name,
      r.email ?? "",
      r.phone ?? "",
      AUDIENCE_LABEL[r.audience] ?? r.audience,
      r.consent_email ? "sim" : "não",
      r.consent_whatsapp ? "sim" : "não",
      new Date(r.consent_at).toLocaleString("pt-BR"),
      r.policy_version,
      r.consent_text,
      (r.filters?.regions ?? []).join(", "),
      (r.filters?.propertyTypes ?? []).join(", "),
      fmtDate(r.broadcast_added_at),
      new Date(r.created_at).toLocaleDateString("pt-BR"),
    ]
      .map(csvCell)
      .join(";"),
  );

  // BOM para o Excel abrir os acentos corretamente.
  const blob = new Blob(["﻿" + [header, ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lista-oportunidades-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Filter = "pending" | "all" | "email" | "whatsapp" | "unsubscribed";

const FILTER_LABEL: Record<Filter, string> = {
  pending: "A incluir",
  all: "Todos ativos",
  email: "Aceitou e-mail",
  whatsapp: "Aceitou WhatsApp",
  unsubscribed: "Saíram da lista",
};

function AdminListaOportunidades() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSubscribers);
  const markFn = useServerFn(markBroadcastAdded);
  const unsubFn = useServerFn(unsubscribeSubscriber);

  const [filter, setFilter] = useState<Filter>("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const query = useQuery({ queryKey: ["admin", "lista-oportunidades"], queryFn: () => listFn({}) });
  const all = useMemo(() => query.data ?? [], [query.data]);

  const rows = useMemo(() => {
    const active = all.filter((r) => !r.unsubscribed_at);
    switch (filter) {
      case "pending":
        return active.filter((r) => !r.broadcast_added_at);
      case "email":
        return active.filter((r) => r.consent_email);
      case "whatsapp":
        return active.filter((r) => r.consent_whatsapp);
      case "unsubscribed":
        return all.filter((r) => r.unsubscribed_at);
      default:
        return active;
    }
  }, [all, filter]);

  const stats = useMemo(() => {
    const active = all.filter((r) => !r.unsubscribed_at);
    return {
      total: active.length,
      email: active.filter((r) => r.consent_email).length,
      whatsapp: active.filter((r) => r.consent_whatsapp).length,
      pending: active.filter((r) => !r.broadcast_added_at).length,
    };
  }, [all]);

  const mark = useMutation({
    mutationFn: (vars: { ids: string[]; added: boolean }) => markFn({ data: vars }),
    onSuccess: (data) => {
      toast.success(`${data.count} contato(s) atualizados.`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin", "lista-oportunidades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unsub = useMutation({
    mutationFn: (id: string) => unsubFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Contato removido da lista.");
      qc.invalidateQueries({ queryKey: ["admin", "lista-oportunidades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-8 border-b border-ink/10 pb-6">
          <Link
            to="/admin"
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-ink"
          >
            ← Admin
          </Link>
          <h1 className="font-serif mt-3 text-3xl">Lista de oportunidades</h1>
          <p className="mt-2 max-w-[74ch] text-sm text-muted-foreground">
            Contatos que autorizaram receber as oportunidades. O envio é manual: exporte o CSV,
            inclua na lista de transmissão e marque quem já entrou, para não repetir na próxima
            leva.
          </p>
        </header>

        {/* ---------------------------------------------------------- números */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Ativos", value: stats.total },
            { label: "Aceitam e-mail", value: stats.email },
            { label: "Aceitam WhatsApp", value: stats.whatsapp },
            { label: "Ainda fora da lista", value: stats.pending },
          ].map((s) => (
            <div key={s.label} className="border border-ink/10 p-4">
              <p className="font-serif text-3xl">{s.value}</p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Aviso operacional: o teto de 256 e a exigência de número salvo são
            limites reais da lista de transmissão do WhatsApp, e explicam por
            que parte dos contatos não recebe. */}
        <div className="mb-8 border-l-2 border-brand-yellow bg-ink/[0.03] px-5 py-4 text-sm text-muted-foreground">
          <p className="max-w-[80ch]">
            <strong className="text-ink">Antes de disparar pelo WhatsApp:</strong> a lista de
            transmissão do aplicativo entrega no máximo 256 contatos por lista, e só chega em quem
            tem o número da imobiliária salvo na agenda. Vale enviar antes uma mensagem individual
            pedindo para salvar o contato — quem não salvar não recebe, mesmo constando aqui.
          </p>
        </div>

        {/* ---------------------------------------------------------- filtros */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                className={`px-3 py-1.5 text-[10px] uppercase tracking-widest transition ${
                  filter === f ? "bg-ink text-canvas" : "border border-ink/20 hover:bg-ink/5"
                }`}
                onClick={() => {
                  setFilter(f);
                  setSelected(new Set());
                }}
              >
                {FILTER_LABEL[f]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btn}
              disabled={!rows.length}
              onClick={() => downloadCsv(rows)}
            >
              Exportar CSV ({rows.length})
            </button>
            <button
              type="button"
              className={btnPrimary}
              disabled={!selected.size || mark.isPending}
              onClick={() => mark.mutate({ ids: [...selected], added: true })}
            >
              Marcar como incluídos ({selected.size})
            </button>
          </div>
        </div>

        {/* ----------------------------------------------------------- tabela */}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="border border-ink/10 p-8 text-center text-sm text-muted-foreground">
            Nenhum contato neste recorte.
          </p>
        ) : (
          <div className="overflow-x-auto border border-ink/10">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-ink/15 text-left">
                  <th className="w-10 p-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#F2DA00]"
                      aria-label="Selecionar todos"
                      checked={allSelected}
                      onChange={() =>
                        setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))
                      }
                    />
                  </th>
                  {["Contato", "Perfil", "Canais", "Interesse", "Aceite", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="p-3 text-[10px] uppercase tracking-widest text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-ink/8 align-top">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#F2DA00]"
                        aria-label={`Selecionar ${r.name}`}
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                      />
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.email ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{prettyPhone(r.phone)}</p>
                    </td>
                    <td className="p-3 text-xs">{AUDIENCE_LABEL[r.audience] ?? r.audience}</td>
                    <td className="p-3 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {r.consent_email ? (
                          <span className="border border-ink/20 px-1.5 py-0.5 text-[9px] uppercase tracking-widest">
                            e-mail
                          </span>
                        ) : null}
                        {r.consent_whatsapp ? (
                          <span className="border border-ink/20 px-1.5 py-0.5 text-[9px] uppercase tracking-widest">
                            whatsapp
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {[...(r.filters?.regions ?? []), ...(r.filters?.propertyTypes ?? [])].join(
                        ", ",
                      ) || "—"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {fmtDate(r.consent_at)}
                      <br />
                      <span className="text-[10px]">{r.policy_version}</span>
                    </td>
                    <td className="p-3 text-xs">
                      {r.unsubscribed_at ? (
                        <span className="text-muted-foreground">
                          saiu em {fmtDate(r.unsubscribed_at)}
                        </span>
                      ) : r.broadcast_added_at ? (
                        <span>na lista desde {fmtDate(r.broadcast_added_at)}</span>
                      ) : (
                        <span className="text-muted-foreground">a incluir</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {!r.unsubscribed_at ? (
                        <button
                          type="button"
                          className={btn}
                          disabled={unsub.isPending}
                          onClick={() => unsub.mutate(r.id)}
                        >
                          Remover
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
