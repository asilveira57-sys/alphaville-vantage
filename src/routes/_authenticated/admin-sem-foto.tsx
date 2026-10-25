import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { listMissingRealPhotos, type MissingPhotoRow } from "@/lib/missing-photos.functions";

const missingQO = queryOptions({
  queryKey: ["admin", "missing-real-photos"],
  queryFn: () => listMissingRealPhotos(),
  staleTime: 30_000,
});

export const Route = createFileRoute("/_authenticated/admin-sem-foto")({
  head: () => ({ meta: [{ title: "Sem foto real — Admin S.A Imóveis" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(missingQO),
  component: AdminSemFoto,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <div className="max-w-2xl mx-auto px-6 py-24 text-sm text-destructive">{(error as Error).message}</div>
    </SiteLayout>
  ),
});

const KINDS: Array<{ key: MissingPhotoRow["kind"]; label: string }> = [
  { key: "guia_condominio", label: "Guias de condomínio" },
  { key: "condominio", label: "Condomínios" },
  { key: "guia", label: "Guias e páginas" },
  { key: "rua", label: "Ruas" },
  { key: "bairro", label: "Bairros" },
  { key: "post", label: "Posts do blog" },
  { key: "imovel", label: "Imóveis ativos" },
];

function EditLink({ row }: { row: MissingPhotoRow }) {
  const cls = "text-xs uppercase tracking-widest underline hover:no-underline";
  switch (row.kind) {
    case "guia_condominio":
    case "guia":
    case "bairro":
    case "post":
      return <Link to="/cms/$id" params={{ id: row.id }} className={cls}>Editar</Link>;
    case "rua":
      return <Link to="/admin-ruas/$id" params={{ id: row.id }} className={cls}>Editar</Link>;
    case "condominio":
      return <Link to="/admin-cards" className={cls}>Adicionar foto</Link>;
    case "imovel":
      return <Link to="/audit/$id" params={{ id: row.id }} className={cls}>Editar</Link>;
  }
}

function AdminSemFoto() {
  const { data: rows } = useSuspenseQuery(missingQO);
  const [kind, setKind] = useState<MissingPhotoRow["kind"] | "all">("all");
  const [onlyPublished, setOnlyPublished] = useState(true);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      if (onlyPublished && !["published", "active"].includes(r.status)) continue;
      m.set(r.kind, (m.get(r.kind) ?? 0) + 1);
    }
    return m;
  }, [rows, onlyPublished]);

  const visible = useMemo(
    () =>
      rows
        .filter((r) => kind === "all" || r.kind === kind)
        .filter((r) => !onlyPublished || ["published", "active"].includes(r.status))
        .sort((a, b) => a.title.localeCompare(b.title, "pt-BR")),
    [rows, kind, onlyPublished],
  );

  return (
    <SiteLayout>
      <section className="px-6 py-10 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-2xl">Sem foto real</h1>
          <Link to="/admin" className="text-xs uppercase tracking-widest underline">← Admin</Link>
        </div>
        <p className="text-sm text-muted-foreground max-w-[75ch]">
          Itens que aparecem no site com o fundo neutro da marca, porque não têm foto própria nem
          foto de imóvel ativo para usar no lugar. Guias de condomínio usam, nesta ordem: foto do guia,
          foto do condomínio, foto do imóvel ativo mais recente do condomínio.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setKind("all")}
            className={`border px-3 py-1.5 text-xs uppercase tracking-widest ${kind === "all" ? "bg-ink text-canvas border-ink" : "border-ink/30"}`}
          >
            Todos ({[...counts.values()].reduce((a, b) => a + b, 0)})
          </button>
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              className={`border px-3 py-1.5 text-xs uppercase tracking-widest ${kind === k.key ? "bg-ink text-canvas border-ink" : "border-ink/30"}`}
            >
              {k.label} ({counts.get(k.key) ?? 0})
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-xs">
            <input type="checkbox" checked={onlyPublished} onChange={(e) => setOnlyPublished(e.target.checked)} />
            Só publicados / ativos
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada sem foto nesta categoria.</p>
        ) : (
          <div className="overflow-x-auto border border-ink/10">
            <table className="w-full text-sm">
              <thead className="bg-ink/[0.03] text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Título</th>
                  <th className="px-3 py-2">Situação</th>
                  <th className="px-3 py-2">Motivo</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={`${r.kind}-${r.id}`} className="border-t border-ink/8">
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{KINDS.find((k) => k.key === r.kind)?.label ?? r.kind}</td>
                    <td className="px-3 py-2">{r.title}<div className="text-xs text-muted-foreground">{r.slug}</div></td>
                    <td className="px-3 py-2 text-xs">{r.status}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.detail}</td>
                    <td className="px-3 py-2 text-right"><EditLink row={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
