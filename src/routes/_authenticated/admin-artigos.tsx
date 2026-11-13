import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { AdminGate, AdminPageHeader } from "@/components/admin/admin-gate";
import { generatePostWithAI } from "@/lib/blog.functions";
import { listEditorialPages } from "@/lib/editorial.functions";

export const Route = createFileRoute("/_authenticated/admin-artigos")({
  head: () => ({ meta: [{ title: "Admin · Artigos e IA — Portal S.A" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (
    <AdminGate>
      <ArtigosPage />
    </AdminGate>
  ),
});

function ArtigosPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const postsFn = useServerFn(listEditorialPages);
  const genFn = useServerFn(generatePostWithAI);
  const [postsPage, setPostsPage] = useState(1);
  const [postsSearch, setPostsSearch] = useState("");
  const POSTS_PAGE_SIZE = 30;

  const postsQ = useQuery({
    queryKey: ["adminPosts"], queryFn: () => postsFn({ data: { contentType: "blog" } }),
  });

  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const genMut = useMutation({
    mutationFn: () => genFn({ data: { topic, category: category || undefined } }),
    onSuccess: (res) => {
      setTopic("");
      qc.invalidateQueries({ queryKey: ["adminPosts"] });
      if (res?.post?.id) router.navigate({ to: "/cms/$id", params: { id: res.post.id } });
    },
  });

  return (
    <SiteLayout>
      <div className="max-w-6xl mx-auto px-6 py-14 space-y-16">
        <AdminPageHeader eyebrow="Conteúdo" title="Artigos e IA">
          <Link to="/cms" className="bg-ink text-canvas px-4 py-2 text-xs uppercase tracking-widest font-medium hover:bg-ink/85">CMS editorial →</Link>
        </AdminPageHeader>
        <section>
          <h2 className="font-serif text-2xl text-ink mb-4">Gerar artigo com IA</h2>
          <div className="space-y-3 max-w-2xl">
            <input
              value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder='Ex.: "Como nasceu Alphaville e o legado de Yojiro Takaoka"'
              className="w-full border border-ink/15 px-4 py-3 text-sm bg-transparent focus:outline-none focus:border-ink"
            />
            <input
              value={category} onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoria (opcional): História, Mercado, Condomínios…"
              className="w-full border border-ink/15 px-4 py-3 text-sm bg-transparent focus:outline-none focus:border-ink"
            />
            <button
              disabled={!topic || genMut.isPending}
              onClick={() => genMut.mutate()}
              className="bg-ink text-canvas px-5 py-3 text-xs uppercase tracking-widest font-medium hover:bg-ink/85 disabled:opacity-50"
            >
              {genMut.isPending ? "Gerando…" : "Gerar rascunho"}
            </button>
            {genMut.error && <p className="text-xs text-red-600">{(genMut.error as Error).message}</p>}
            {genMut.data && <p className="text-xs text-emerald-700">Rascunho criado: {genMut.data.post.title}</p>}
          </div>
        </section>

        <section>
          {(() => {
            const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const q = norm(postsSearch.trim());
            const allPosts = (postsQ.data ?? []).filter((p) => {
              if (!q) return true;
              return norm(p.title ?? "").includes(q) || norm(p.slug ?? "").includes(q);
            });
            const totalPages = Math.max(1, Math.ceil(allPosts.length / POSTS_PAGE_SIZE));
            const currentPage = Math.min(postsPage, totalPages);
            const startIdx = (currentPage - 1) * POSTS_PAGE_SIZE;
            const pagePosts = allPosts.slice(startIdx, startIdx + POSTS_PAGE_SIZE);
            return (
              <>
                <div className="flex items-baseline justify-between mb-4 gap-4 flex-wrap">
                  <h2 className="font-serif text-2xl text-ink">Posts</h2>
                  <input
                    value={postsSearch}
                    onChange={(e) => { setPostsSearch(e.target.value); setPostsPage(1); }}
                    placeholder="Buscar por título ou slug (ex.: coworking, hospital)…"
                    className="flex-1 min-w-[240px] max-w-md border border-ink/15 px-3 py-2 text-sm bg-transparent focus:outline-none focus:border-ink"
                  />
                  <span className="text-xs text-muted-foreground">
                    {allPosts.length} resultado(s) · pág. {currentPage}/{totalPages}
                  </span>
                </div>
                <div className="border border-ink/10">
                  {pagePosts.map((p) => (
                    <div key={p.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-ink/8 text-sm items-center">
                      <div className="col-span-6 font-medium text-ink truncate">
                        <Link to="/cms/$id" params={{ id: p.id }} className="hover:underline">{p.title}</Link>
                      </div>
                      <div className="col-span-2 text-xs uppercase tracking-wider text-muted-foreground">{p.status}</div>
                      <div className="col-span-2 text-xs text-muted-foreground truncate">/{p.slug}</div>
                      <div className="col-span-2 text-right">
                        <Link to="/cms/$id" params={{ id: p.id }} className="text-xs uppercase tracking-widest text-ink hover:underline">Editar</Link>
                      </div>
                    </div>
                  ))}
                  {allPosts.length === 0 && (
                    <div className="px-4 py-8 text-sm text-muted-foreground text-center">Nenhum post ainda.</div>
                  )}
                </div>
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPostsPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-xs uppercase tracking-widest border border-ink/15 disabled:opacity-30 hover:bg-ink/5"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-muted-foreground px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPostsPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-xs uppercase tracking-widest border border-ink/15 disabled:opacity-30 hover:bg-ink/5"
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </section>

      </div>
    </SiteLayout>
  );
}
