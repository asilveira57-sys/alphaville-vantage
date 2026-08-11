import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { listPendingContent } from "@/lib/pending-content.functions";
import { deleteEditorialPage } from "@/lib/editorial.functions";

export const Route = createFileRoute("/_authenticated/admin-pendentes")({
  head: () => ({ meta: [{ title: "Conteúdo pendente — Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: PendingPage,
});

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "empty", label: "Sem conteúdo" },
  { key: "short", label: "Texto curto" },
  { key: "image", label: "Sem imagem" },
  { key: "seo", label: "SEO incompleto" },
] as const;

function PendingPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPendingContent);
  const delFn = useServerFn(deleteEditorialPage);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["pendingContent"], queryFn: () => listFn() });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      setConfirmId(null);
      qc.invalidateQueries({ queryKey: ["pendingContent"] });
      qc.invalidateQueries({ queryKey: ["adminPosts"] });
    },
  });

  const items = useMemo(() => {
    const all = q.data?.items ?? [];
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const term = norm(search.trim());
    return all.filter((i) => {
      if (term && !norm(`${i.title} ${i.slug} ${i.content_type}`).includes(term)) return false;
      if (filter === "empty") return i.chars === 0;
      if (filter === "short") return i.chars > 0 && i.chars < 600;
      if (filter === "image") return i.issues.includes("Sem imagem");
      if (filter === "seo") return i.issues.includes("SEO incompleto");
      return true;
    });
  }, [q.data, filter, search]);

  const s = q.data?.summary;

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">Administração</p>
            <h1 className="font-serif text-4xl text-ink">Conteúdo pendente</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              Páginas editoriais com texto ausente ou curto, sem imagem, sem resumo ou com SEO incompleto.
              Edite o que for aproveitável e exclua o que não for.
            </p>
          </div>
          <Link to="/admin" className="border border-ink text-ink px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink hover:text-canvas">
            ← Admin
          </Link>
        </div>

        {s && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {[
              ["Pendentes", s.total],
              ["Sem conteúdo", s.empty],
              ["Texto curto", s.short],
              ["Sem imagem", s.noImage],
              ["SEO incompleto", s.noSeo],
            ].map(([label, value]) => (
              <div key={label as string} className="border border-ink/10 px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
                <div className="font-serif text-2xl text-ink">{value as number}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 text-[10px] uppercase tracking-widest border ${
                filter === f.key ? "bg-ink text-canvas border-ink" : "border-ink/15 text-ink hover:bg-ink/5"
              }`}
            >
              {f.label}
            </button>
          ))}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, slug ou tipo…"
            className="flex-1 min-w-[220px] border border-ink/15 px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-ink"
          />
        </div>

        {delMut.error && <p className="text-xs text-red-600">{(delMut.error as Error).message}</p>}

        <div className="border border-ink/10">
          {q.isLoading && <div className="px-4 py-8 text-sm text-muted-foreground text-center">Carregando…</div>}
          {!q.isLoading && items.length === 0 && (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">Nada pendente neste filtro.</div>
          )}
          {items.map((i) => (
            <div key={i.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-ink/8 text-sm items-center">
              <div className="col-span-5">
                <Link to="/cms/$id" params={{ id: i.id }} className="font-medium text-ink hover:underline">
                  {i.title || "(sem título)"}
                </Link>
                <div className="text-xs text-muted-foreground truncate">
                  {i.content_type} · /{i.slug} · {i.chars} car.
                </div>
              </div>
              <div className="col-span-4 flex flex-wrap gap-1">
                {i.issues.map((issue) => (
                  <span key={issue} className="text-[10px] uppercase tracking-wider border border-amber-500/40 bg-amber-50/60 text-amber-900 px-2 py-0.5">
                    {issue}
                  </span>
                ))}
              </div>
              <div className="col-span-1 text-[10px] uppercase tracking-wider text-muted-foreground">{i.status}</div>
              <div className="col-span-2 flex justify-end gap-3 items-center">
                <Link to="/cms/$id" params={{ id: i.id }} className="text-xs uppercase tracking-widest text-ink hover:underline">
                  Editar
                </Link>
                {confirmId === i.id ? (
                  <span className="flex items-center gap-2">
                    <button
                      onClick={() => delMut.mutate(i.id)}
                      disabled={delMut.isPending}
                      className="text-xs uppercase tracking-widest text-red-600 hover:underline disabled:opacity-50"
                    >
                      {delMut.isPending ? "…" : "Confirmar"}
                    </button>
                    <button onClick={() => setConfirmId(null)} className="text-xs uppercase tracking-widest text-muted-foreground hover:underline">
                      Não
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmId(i.id)}
                    className="text-xs uppercase tracking-widest text-red-600 hover:underline"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SiteLayout>
  );
}
