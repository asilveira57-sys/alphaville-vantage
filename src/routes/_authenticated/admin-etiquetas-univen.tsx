import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { listUnivenTags, mapUnivenTag, createCondoForTag } from "@/lib/univen-tags.functions";

export const Route = createFileRoute("/_authenticated/admin-etiquetas-univen")({
  head: () => ({ meta: [{ title: "Etiquetas da Univen — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

type Usage = "residencial" | "comercial" | "misto";

function csvDownload(name: string, rows: (string | number | null)[][]) {
  const body = rows.map((l) => l.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function Page() {
  const listFn = useServerFn(listUnivenTags);
  const mapFn = useServerFn(mapUnivenTag);
  const createFn = useServerFn(createCondoForTag);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["univen-tags"], queryFn: () => listFn() });
  const [open, setOpen] = useState<{ tag: string; mode: "map" | "create" } | null>(null);
  const [condoId, setCondoId] = useState("");
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [usage, setUsage] = useState<Usage>("residencial");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (!open) return;
    setBusy(true); setMsg(null);
    try {
      const r = open.mode === "map"
        ? await mapFn({ data: { tag: open.tag, condominiumId: condoId } })
        : await createFn({ data: { tag: open.tag, name, region, usage } });
      setMsg(`"${open.tag}": ${r.linked} imóveis vinculados${r.skipped.length ? ` · não vinculados: ${r.skipped.join(", ")}` : ""}`);
      setOpen(null);
      qc.invalidateQueries({ queryKey: ["univen-tags"] });
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin" className="text-xs underline">← Admin</Link>
          <h1 className="font-serif text-3xl">Etiquetas da Univen</h1>
          <p className="text-sm text-muted-foreground">Empreendimentos da Univen que ainda não apontam para um condomínio da Central. Vincular só afeta imóveis sem condomínio e sem ajuste manual.</p>
        </div>
        {data && (
          <Button variant="outline" onClick={() => csvDownload("apelidos-univen.csv", [["etiqueta_univen", "uso", "condominio_oficial", "imoveis_ativos"], ...data.mapped.map((m) => [m.tag, m.usage ?? "", m.ignored ? "(ignorada)" : m.condominium ?? "", m.count])])}>
            Exportar apelidos (CSV)
          </Button>
        )}
      </div>
      {msg && <p className="rounded border p-3 text-sm">{msg}</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {error && <p className="text-sm text-destructive">{String((error as Error).message)}</p>}
      {data && (
        <>
          <p className="text-sm">{data.unmapped.length} etiquetas sem mapeamento · {data.unmapped.reduce((s, u) => s + u.count, 0)} imóveis · {data.withoutCondo} imóveis ativos sem condomínio no total</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>{["Etiqueta", "Imóveis", "Motivo", "Sugestão", ""].map((h) => <th key={h} className="p-2">{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.unmapped.map((u) => (
                  <tr key={u.tag} className="border-t align-top">
                    <td className="p-2 font-medium">{u.tag}</td>
                    <td className="p-2" title={u.codes.join(" ")}>{u.count}</td>
                    <td className="p-2 text-xs text-muted-foreground">{u.reason}</td>
                    <td className="p-2 text-xs">{[u.suggestion.neighborhood, u.suggestion.city, u.suggestion.usage].filter(Boolean).join(" · ")}</td>
                    <td className="p-2 whitespace-nowrap space-x-2">
                      <Button size="sm" variant="outline" onClick={() => { setOpen({ tag: u.tag, mode: "map" }); setCondoId(""); }}>Vincular a condomínio existente</Button>
                      <Button size="sm" onClick={() => { setOpen({ tag: u.tag, mode: "create" }); setName(u.tag); setRegion(u.suggestion.neighborhood ?? ""); setUsage(u.suggestion.usage); }}>Criar condomínio</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {open && (
            <div className="rounded-lg border p-4 space-y-3 text-sm">
              <p className="font-semibold">{open.mode === "map" ? "Vincular" : "Criar condomínio para"} “{open.tag}”</p>
              {open.mode === "map" ? (
                <select className="w-full rounded border bg-background p-2" value={condoId} onChange={(e) => setCondoId(e.target.value)}>
                  <option value="">Escolha o condomínio…</option>
                  {data.condos.map((c) => <option key={c.id} value={c.id}>{c.name}{c.usage ? ` (${c.usage})` : ""}</option>)}
                </select>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3">
                  <input className="rounded border bg-background p-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome oficial" />
                  <input className="rounded border bg-background p-2" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Bairro / região" />
                  <select className="rounded border bg-background p-2" value={usage} onChange={(e) => setUsage(e.target.value as Usage)}>
                    <option value="residencial">Residencial</option><option value="comercial">Comercial</option><option value="misto">Misto</option>
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <Button disabled={busy || (open.mode === "map" ? !condoId : name.trim().length < 2)} onClick={submit}>{busy ? "Gravando…" : "Confirmar"}</Button>
                <Button variant="ghost" onClick={() => setOpen(null)}>Cancelar</Button>
              </div>
            </div>
          )}
          <details className="rounded-lg border p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Apelidos cadastrados ({data.mapped.length})</summary>
            <ul className="mt-2 space-y-1">
              {data.mapped.map((m) => <li key={m.id}>{m.tag}{m.usage ? ` (${m.usage})` : ""} → {m.ignored ? "ignorada" : m.condominium} · {m.count} imóveis</li>)}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
