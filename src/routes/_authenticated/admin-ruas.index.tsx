import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { checkIsAdmin } from "@/lib/admin.functions";
import { deleteStreet, listStreetsForAdmin, upsertStreet } from "@/lib/streets.functions";

export const Route = createFileRoute("/_authenticated/admin-ruas/")({
  head: () => ({ meta: [{ title: "Admin · Ruas — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminRuas,
});

function AdminRuas() {
  const router = useRouter();
  const qc = useQueryClient();
  const checkFn = useServerFn(checkIsAdmin);
  const listFn = useServerFn(listStreetsForAdmin);
  const upsertFn = useServerFn(upsertStreet);
  const deleteFn = useServerFn(deleteStreet);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "draft" | "published" | "archived">("");
  const [newName, setNewName] = useState("");

  const adminQ = useQuery({ queryKey: ["isAdmin"], queryFn: () => checkFn() });
  const listQ = useQuery({
    queryKey: ["admin-streets", search, status],
    queryFn: () => listFn({ data: { search: search || undefined, status: status || undefined } }),
    enabled: !!adminQ.data?.isAdmin,
  });

  const createMut = useMutation({
    mutationFn: () => upsertFn({ data: { name: newName, status: "draft" as const, featured: false, street_type: "rua" as const } }),
    onSuccess: (row: any) => {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["admin-streets"] });
      if (row?.id) router.navigate({ to: "/admin-ruas/$id", params: { id: row.id } });
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-streets"] }),
  });

  if (adminQ.isLoading) return <SiteLayout><div className="px-6 py-24 text-sm text-muted-foreground">Carregando…</div></SiteLayout>;
  if (!adminQ.data?.isAdmin) return <SiteLayout><div className="px-6 py-24 text-center text-sm text-muted-foreground">Acesso restrito. <Link to="/admin" className="underline">Ir para o painel</Link>.</div></SiteLayout>;

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">SEO Local</p>
            <h1 className="font-serif text-4xl text-ink">Ruas e avenidas</h1>
          </div>
          <div className="flex gap-4">
            <Link to="/admin-ruas/relatorios" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-ink">Relatórios →</Link>
            <Link to="/admin" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-ink">← Painel</Link>
          </div>
        </div>

        <section className="border border-ink/10 p-5">
          <h2 className="font-serif text-lg text-ink mb-3">Nova rua</h2>
          <div className="flex gap-2">
            <input
              value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex.: Alameda Rio Negro"
              className="flex-1 border border-ink/15 px-4 py-2 text-sm bg-transparent focus:outline-none focus:border-ink"
            />
            <button
              disabled={!newName || createMut.isPending}
              onClick={() => createMut.mutate()}
              className="bg-ink text-canvas px-5 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50"
            >
              {createMut.isPending ? "Criando…" : "Criar rascunho"}
            </button>
          </div>
          {createMut.error && <p className="text-xs text-red-600 mt-2">{(createMut.error as Error).message}</p>}
        </section>

        <section>
          <div className="flex gap-2 mb-4">
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome…"
              className="flex-1 border border-ink/15 px-4 py-2 text-sm bg-transparent focus:outline-none focus:border-ink"
            />
            <select
              value={status} onChange={(e) => setStatus(e.target.value as any)}
              className="border border-ink/15 px-3 py-2 text-sm bg-transparent"
            >
              <option value="">Todos os status</option>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>

          <div className="border border-ink/10">
            <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-ink/10 text-[10px] uppercase tracking-widest text-muted-foreground">
              <div className="col-span-4">Nome</div>
              <div className="col-span-2">Bairro / Cidade</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Atualizado</div>
              <div className="col-span-2 text-right">Ações</div>
            </div>
            {(listQ.data ?? []).map((r: any) => (
              <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-ink/8 text-sm items-center">
                <div className="col-span-4">
                  <Link to="/admin-ruas/$id" params={{ id: r.id }} className="font-medium text-ink hover:underline">{r.name}</Link>
                  <div className="text-[11px] text-muted-foreground">/ruas/{r.slug}</div>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground truncate">{r.neighborhood ?? "—"}<br />{r.city ?? "—"}</div>
                <div className="col-span-2 text-[11px] uppercase tracking-widest">
                  <span className={
                    r.status === "published" ? "text-emerald-700" :
                    r.status === "archived" ? "text-muted-foreground" : "text-amber-700"
                  }>{r.status}</span>
                  {r.featured && <span className="ml-2 text-gold">★</span>}
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleDateString("pt-BR")}</div>
                <div className="col-span-2 flex justify-end gap-2 text-[11px] uppercase tracking-widest">
                  <Link to="/admin-ruas/$id" params={{ id: r.id }} className="text-ink hover:underline">Editar</Link>
                  <a href={`/ruas/${r.slug}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-ink">Ver</a>
                  <button
                    onClick={() => { if (confirm(`Excluir "${r.name}"?`)) delMut.mutate(r.id); }}
                    className="text-red-600 hover:underline"
                  >Excluir</button>
                </div>

              </div>
            ))}
            {listQ.data?.length === 0 && (
              <div className="px-4 py-8 text-sm text-muted-foreground text-center">Nenhuma rua cadastrada.</div>
            )}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
